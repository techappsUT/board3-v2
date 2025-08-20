import { BaseEntity } from './common';

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  acceptTerms: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// JWT payload
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  iat: number;
  exp: number;
  jti?: string; // JWT ID
  permissions?: string[];
  roles?: string[];
}

// Session types
export interface Session extends BaseEntity {
  userId: string;
  token: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
}

// MFA types
export interface MfaSetupRequest {
  password: string;
}

export interface MfaSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface MfaVerifyRequest {
  token: string;
  code: string;
}

export interface MfaDisableRequest {
  password: string;
  code: string;
}

export interface MfaStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
  lastUsed?: Date;
}

// OAuth types
export interface OAuthProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string[];
}

export interface OAuthCallback {
  code: string;
  state: string;
  provider: string;
}

export interface OAuthAccount extends BaseEntity {
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

// User profile (subset of User for auth responses)
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  company?: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  roles: string[];
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
}

// Password policy
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to check
  maxAge: number; // Days before password expires
}

// API key types
export interface ApiKey extends BaseEntity {
  name: string;
  userId: string;
  keyId: string;
  keyHash: string; // Hashed version of the key
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresIn?: number; // Days from now
}

export interface CreateApiKeyResponse {
  keyId: string;
  key: string; // Only returned once
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

// Security events
export interface LoginAttempt extends BaseEntity {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  mfaRequired: boolean;
  mfaSuccess?: boolean;
}

export interface SecurityAlert {
  type: 'suspicious_login' | 'multiple_failures' | 'new_device' | 'password_breach';
  severity: 'low' | 'medium' | 'high';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

// Account lockout
export interface AccountLockout extends BaseEntity {
  userId: string;
  reason: 'too_many_failures' | 'suspicious_activity' | 'admin_action';
  ipAddress?: string;
  expiresAt: Date;
  unlocked: boolean;
  unlockedAt?: Date;
  unlockedBy?: string;
}
