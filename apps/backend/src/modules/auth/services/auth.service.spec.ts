import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

import { AuthService } from './auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../cache/redis.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import { RegisterDto, LoginDto } from '../dto';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let encryptionService: EncryptionService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    passwordHash: '$2b$12$test.hash',
    mfaEnabled: false,
    mfaSecret: null,
    isEmailVerified: true,
    isActive: true,
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };

  const mockEncryptionService = {
    encryptSecret: jest.fn(),
    decryptSecret: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      password: 'StrongP@ssw0rd123',
      timezone: 'UTC',
    };

    it('should successfully register a new user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          username: registerDto.username,
          timezone: registerDto.timezone,
          passwordHash: expect.any(String),
        }),
        select: expect.any(Object),
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ ...mockUser, email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ ...mockUser, username: registerDto.username });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongP@ssw0rd123',
    };

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null); // No rate limit
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    });

    it('should successfully log in a user without MFA', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(result.requiresMfa).toBeUndefined();
    });

    it('should require MFA when enabled', async () => {
      const userWithMfa = { ...mockUser, mfaEnabled: true, mfaSecret: 'encrypted-secret' };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithMfa);

      const result = await service.login(loginDto);

      expect(result.requiresMfa).toBe(true);
      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
    });

    it('should successfully log in with valid MFA token', async () => {
      const userWithMfa = { ...mockUser, mfaEnabled: true, mfaSecret: 'encrypted-secret' };
      const loginDtoWithMfa = { ...loginDto, mfaToken: '123456' };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithMfa);
      mockEncryptionService.decryptSecret.mockReturnValue('decrypted-secret');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      const result = await service.login(loginDtoWithMfa);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid MFA token', async () => {
      const userWithMfa = { ...mockUser, mfaEnabled: true, mfaSecret: 'encrypted-secret' };
      const loginDtoWithMfa = { ...loginDto, mfaToken: '123456' };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithMfa);
      mockEncryptionService.decryptSecret.mockReturnValue('decrypted-secret');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);

      await expect(service.login(loginDtoWithMfa)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle rate limiting', async () => {
      mockRedisService.get.mockResolvedValue('5'); // Max attempts reached

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = { refreshToken: 'valid-refresh-token' };

    it('should successfully refresh tokens', async () => {
      const mockPayload = { sub: 'user-id', email: 'test@example.com' };
      const mockStoredToken = {
        id: 'token-id',
        user: mockUser,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({ id: 'token-id' });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'new-token-id' });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.refreshToken(refreshTokenDto);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const mockPayload = { sub: 'user-id', email: 'test@example.com' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setupMfa', () => {
    it('should generate MFA setup information', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(speakeasy, 'generateSecret').mockReturnValue({
        otpauth_url: 'otpauth://totp/Board3%20%28test%40example.com%29?secret=TESTSECRET&issuer=Board3',
        base32: 'TESTSECRET',
      } as any);

      const result = await service.setupMfa('user-id');

      expect(result).toHaveProperty('secret', 'TESTSECRET');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('manualEntryKey', 'TESTSECRET');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.setupMfa('user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if MFA already enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      await expect(service.setupMfa('user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('enableMfa', () => {
    const enableMfaDto = { token: '123456' };

    it('should successfully enable MFA', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(speakeasy, 'generateSecret').mockReturnValue({ base32: 'TESTSECRET' } as any);
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);
      mockEncryptionService.encryptSecret.mockReturnValue('encrypted-secret');
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, mfaEnabled: true });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      await expect(service.enableMfa('user-id', enableMfaDto)).resolves.toBeUndefined();

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          mfaEnabled: true,
          mfaSecret: 'encrypted-secret',
        },
      });
    });

    it('should throw UnauthorizedException for invalid MFA token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(speakeasy, 'generateSecret').mockReturnValue({ base32: 'TESTSECRET' } as any);
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);

      await expect(service.enableMfa('user-id', enableMfaDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'current-password',
      newPassword: 'NewP@ssw0rd123',
    };

    it('should successfully change password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password' as never);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'new-hashed-password' });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      await expect(service.changePassword('user-id', changePasswordDto)).resolves.toBeUndefined();

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { passwordHash: 'new-hashed-password' },
      });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changePassword('user-id', changePasswordDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    const payload = { sub: 'user-id', email: 'test@example.com' };

    it('should return user for valid payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });
});