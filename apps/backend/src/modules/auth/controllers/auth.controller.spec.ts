import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from '../dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    setupMfa: jest.fn(),
    enableMfa: jest.fn(),
    disableMfa: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    mfaEnabled: false,
    isEmailVerified: true,
  };

  const mockAuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
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

    it('should successfully register a user', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongP@ssw0rd123',
    };

    const mockRequest = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    it('should successfully log in a user', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'Mozilla/5.0');
    });

    it('should handle login with MFA requirement', async () => {
      const mfaResponse = {
        ...mockAuthResponse,
        accessToken: '',
        refreshToken: '',
        requiresMfa: true,
      };
      mockAuthService.login.mockResolvedValue(mfaResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(mfaResponse);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('logout', () => {
    it('should successfully log out user', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('user-id', { refreshToken: 'refresh-token' });

      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith('user-id', 'refresh-token');
    });

    it('should log out user without refresh token', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('user-id');

      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith('user-id', undefined);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });

  describe('setupMfa', () => {
    it('should return MFA setup information', async () => {
      const mfaSetup = {
        secret: 'TESTSECRET',
        qrCodeUrl: 'data:image/png;base64,test-qr-code',
        manualEntryKey: 'TESTSECRET',
      };
      mockAuthService.setupMfa.mockResolvedValue(mfaSetup);

      const result = await controller.setupMfa('user-id');

      expect(result).toEqual(mfaSetup);
      expect(authService.setupMfa).toHaveBeenCalledWith('user-id');
    });
  });

  describe('enableMfa', () => {
    const enableMfaDto = { token: '123456' };

    it('should successfully enable MFA', async () => {
      mockAuthService.enableMfa.mockResolvedValue(undefined);

      const result = await controller.enableMfa('user-id', enableMfaDto);

      expect(result).toBeUndefined();
      expect(authService.enableMfa).toHaveBeenCalledWith('user-id', enableMfaDto);
    });
  });

  describe('disableMfa', () => {
    const disableMfaDto = { password: 'current-password', token: '123456' };

    it('should successfully disable MFA', async () => {
      mockAuthService.disableMfa.mockResolvedValue(undefined);

      const result = await controller.disableMfa('user-id', disableMfaDto);

      expect(result).toBeUndefined();
      expect(authService.disableMfa).toHaveBeenCalledWith('user-id', disableMfaDto);
    });
  });

  describe('verifyMfa', () => {
    const verifyMfaDto = { token: '123456' };

    it('should return MFA verification result', async () => {
      const result = await controller.verifyMfa('user-id', verifyMfaDto);

      expect(result).toEqual({ valid: true });
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'current-password',
      newPassword: 'NewP@ssw0rd123',
    };

    it('should successfully change password', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword('user-id', changePasswordDto);

      expect(result).toBeUndefined();
      expect(authService.changePassword).toHaveBeenCalledWith('user-id', changePasswordDto);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all user sessions', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.revokeAllSessions('user-id');

      expect(result).toBeUndefined();
      expect(authService.logout).toHaveBeenCalledWith('user-id');
    });
  });
});