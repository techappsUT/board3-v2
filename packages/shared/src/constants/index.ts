// Application constants

// API Response codes
export const API_CODES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// File constraints
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
    'text/yaml',
    'application/x-yaml',
  ],
  UPLOAD_PATH: '/uploads',
} as const;

// Password constraints
export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

// JWT settings
export const JWT_SETTINGS = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  ISSUER: 'board3.ai',
  AUDIENCE: 'board3-api',
} as const;

// Rate limiting
export const RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 5,
  },
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
  },
  AI: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 5,
  },
} as const;

// Cloud providers
export const CLOUD_PROVIDERS = {
  AWS: 'aws',
  AZURE: 'azure',
  GCP: 'gcp',
  OCI: 'oci',
} as const;

// Terraform settings
export const TERRAFORM = {
  VERSION: '1.6.0',
  TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_PLAN_SIZE: 1024 * 1024, // 1MB
  STATE_LOCK_TIMEOUT: 10 * 60 * 1000, // 10 minutes
} as const;

// AI settings
export const AI_SETTINGS = {
  DEFAULT_MODEL: 'gpt-4',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.1,
  TIMEOUT: 30 * 1000, // 30 seconds
  MAX_CONTEXT_LENGTH: 8192,
} as const;

// Validation regex patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD:
    'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character',
  PASSWORD_MISMATCH: 'Passwords do not match',
  INVALID_UUID: 'Invalid UUID format',
  INVALID_URL: 'Invalid URL format',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'File type not supported',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists',
  RATE_LIMITED: 'Too many requests, please try again later',
  SERVER_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  PROJECT_CREATED: 'Project created successfully',
  PROJECT_UPDATED: 'Project updated successfully',
  PROJECT_DELETED: 'Project deleted successfully',
  DESIGN_CREATED: 'Design created successfully',
  DESIGN_UPDATED: 'Design updated successfully',
  DESIGN_DELETED: 'Design deleted successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  MFA_ENABLED: 'Multi-factor authentication enabled',
  MFA_DISABLED: 'Multi-factor authentication disabled',
  TERRAFORM_PLAN_GENERATED: 'Terraform plan generated successfully',
  TERRAFORM_APPLIED: 'Terraform applied successfully',
  AI_GENERATION_COMPLETE: 'AI generation completed successfully',
} as const;

// Event types for audit logging
export const AUDIT_EVENTS = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  DESIGN_CREATED: 'design.created',
  DESIGN_UPDATED: 'design.updated',
  DESIGN_DELETED: 'design.deleted',
  TERRAFORM_PLANNED: 'terraform.planned',
  TERRAFORM_APPLIED: 'terraform.applied',
  TERRAFORM_DESTROYED: 'terraform.destroyed',
  AI_GENERATED: 'ai.generated',
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',
} as const;

// WebSocket event types
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  DESIGN_UPDATE: 'design_update',
  CURSOR_MOVE: 'cursor_move',
  USER_TYPING: 'user_typing',
  COLLABORATION_START: 'collaboration_start',
  COLLABORATION_END: 'collaboration_end',
  NOTIFICATION: 'notification',
  ERROR: 'error',
} as const;

// Performance targets
export const PERFORMANCE_TARGETS = {
  API_RESPONSE_TIME: {
    SIMPLE: 1, // ms
    COMPLEX: 10, // ms
  },
  DATABASE_QUERY_TIME: {
    OLTP: 5, // ms
    ANALYTICS: 50, // ms
  },
  AI_GENERATION_TIME: 10000, // ms
  FILE_UPLOAD_TIME: 30000, // ms
} as const;

// Security settings
export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  LOCKOUT_ATTEMPTS: 5,
  PASSWORD_HISTORY: 5, // Number of previous passwords to remember
  MFA_CODE_LENGTH: 6,
  MFA_CODE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  API_KEY_LENGTH: 32,
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  HASH_ALGORITHM: 'sha256',
} as const;
