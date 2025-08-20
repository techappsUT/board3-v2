import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../cache/redis.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenDto,
  MfaSetupResponseDto,
  EnableMfaDto,
  DisableMfaDto,
  VerifyMfaDto,
  ChangePasswordDto,
} from '../dto';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60; // 15 minutes in seconds

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private encryptionService: EncryptionService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, firstName, lastName, username, password, timezone } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('User with this email already exists');
      }
      if (existingUser.username === username) {
        throw new ConflictException('Username is already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    try {
      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          ...(username && { username }),
          passwordHash,
          timezone: timezone || 'UTC',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          mfaEnabled: true,
          isEmailVerified: true,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await this.updateLastLogin(user.id);

      // Log successful registration
      await this.logAuditEvent(user.id, 'REGISTER', 'USER', user.id);

      this.logger.log(`User registered successfully: ${email}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          ...user,
          username: user.username || undefined,
        },
      };
    } catch (error) {
      this.logger.error('User registration failed:', error);
      throw new BadRequestException('Registration failed');
    }
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const { email, password, mfaToken } = loginDto;

    // Check for rate limiting
    await this.checkRateLimit(email, ipAddress);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        passwordHash: true,
        mfaEnabled: true,
        mfaSecret: true,
        isEmailVerified: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      await this.incrementFailedAttempts(email, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.incrementFailedAttempts(email, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaToken) {
        return {
          accessToken: '',
          refreshToken: '',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username || undefined,
            mfaEnabled: user.mfaEnabled,
            isEmailVerified: user.isEmailVerified,
          },
          requiresMfa: true,
        };
      }

      const decryptedSecret = this.encryptionService.decryptSecret(user.mfaSecret!);
      const isValidToken = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 2, // Allow 2 time steps of drift
      });

      if (!isValidToken) {
        await this.incrementFailedAttempts(email, ipAddress);
        throw new UnauthorizedException('Invalid MFA token');
      }
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(email, ipAddress);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.updateLastLogin(user.id);

    // Log successful login
    await this.logAuditEvent(user.id, 'LOGIN', 'USER', user.id, ipAddress, userAgent);

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username || undefined,
        mfaEnabled: user.mfaEnabled,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      });

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              mfaEnabled: true,
              isEmailVerified: true,
              isActive: true,
            },
          },
        },
      });

      if (!storedToken || !storedToken.user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Revoke old refresh token
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(storedToken.user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          ...storedToken.user,
          username: storedToken.user.username || undefined,
        },
      };
    } catch (error) {
      this.logger.warn('Refresh token validation failed:', (error as Error).message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Revoke specific refresh token
        await this.prisma.refreshToken.updateMany({
          where: {
            userId,
            token: refreshToken,
          },
          data: { isRevoked: true },
        });
      } else {
        // Revoke all refresh tokens for user
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
      }

      // Log logout
      await this.logAuditEvent(userId, 'LOGOUT', 'USER', userId);

      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.error('Logout failed:', error);
    }
  }

  async setupMfa(userId: string): Promise<MfaSetupResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Board3 (${user.email})`,
      issuer: 'Board3',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32!,
      qrCodeUrl,
      manualEntryKey: secret.base32!,
    };
  }

  async enableMfa(userId: string, enableMfaDto: EnableMfaDto): Promise<void> {
    const { token } = enableMfaDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generate and verify secret with provided token
    const secret = speakeasy.generateSecret({
      name: `Board3 (${userId})`,
      issuer: 'Board3',
      length: 32,
    });

    const isValidToken = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValidToken) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    // Encrypt and store secret
    const encryptedSecret = this.encryptionService.encryptSecret(secret.base32!);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
      },
    });

    // Log MFA enable
    await this.logAuditEvent(userId, 'UPDATE', 'USER', userId, undefined, undefined, { action: 'MFA_ENABLED' });

    this.logger.log(`MFA enabled for user: ${userId}`);
  }

  async disableMfa(userId: string, disableMfaDto: DisableMfaDto): Promise<void> {
    const { password, token } = disableMfaDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA token
    const decryptedSecret = this.encryptionService.decryptSecret(user.mfaSecret!);
    const isValidToken = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValidToken) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // Log MFA disable
    await this.logAuditEvent(userId, 'UPDATE', 'USER', userId, undefined, undefined, { action: 'MFA_DISABLED' });

    this.logger.log(`MFA disabled for user: ${userId}`);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all refresh tokens to force re-login
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    // Log password change
    await this.logAuditEvent(userId, 'UPDATE', 'USER', userId, undefined, undefined, { action: 'PASSWORD_CHANGED' });

    this.logger.log(`Password changed for user: ${userId}`);
  }

  private async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET') || 'default-access-secret',
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'default-refresh-secret',
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Clean up expired refresh tokens
    await this.cleanupExpiredTokens(user.id);

    return { accessToken, refreshToken };
  }

  private async checkRateLimit(email: string, ipAddress?: string): Promise<void> {
    const keys = [
      `login_attempts:${email}`,
      ...(ipAddress ? [`login_attempts:${ipAddress}`] : []),
    ];

    for (const key of keys) {
      const attempts = await this.redisService.get(key);
      if (attempts && parseInt(attempts) >= this.maxLoginAttempts) {
        throw new UnauthorizedException('Too many login attempts. Please try again later.');
      }
    }
  }

  private async incrementFailedAttempts(email: string, ipAddress?: string): Promise<void> {
    const keys = [
      `login_attempts:${email}`,
      ...(ipAddress ? [`login_attempts:${ipAddress}`] : []),
    ];

    for (const key of keys) {
      await this.redisService.incr(key);
      await this.redisService.expire(key, this.lockoutDuration);
    }
  }

  private async resetFailedAttempts(email: string, ipAddress?: string): Promise<void> {
    const keys = [
      `login_attempts:${email}`,
      ...(ipAddress ? [`login_attempts:${ipAddress}`] : []),
    ];

    for (const key of keys) {
      await this.redisService.del(key);
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  private async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: action as any,
          resource,
          resourceId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          details,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
    }
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
    }
  }

  async validateUser(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        mfaEnabled: true,
        isEmailVerified: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }
}