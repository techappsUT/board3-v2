// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  path?: string;
  statusCode?: number;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, any>;
  timestamp: string;
  path?: string;
  statusCode: number;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  timestamp: string;
}

// HTTP status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    MFA_SETUP: '/auth/mfa/setup',
    MFA_VERIFY: '/auth/mfa/verify',
    MFA_DISABLE: '/auth/mfa/disable',
  },

  // Users
  USERS: {
    ME: '/users/me',
    UPDATE_PROFILE: '/users/me',
    CHANGE_PASSWORD: '/users/me/password',
    PREFERENCES: '/users/me/preferences',
    SESSIONS: '/users/me/sessions',
    API_KEYS: '/users/me/api-keys',
    DELETE_ACCOUNT: '/users/me',
  },

  // Projects
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects',
    GET: '/projects/:id',
    UPDATE: '/projects/:id',
    DELETE: '/projects/:id',
    MEMBERS: '/projects/:id/members',
    INVITE: '/projects/:id/invite',
    STATS: '/projects/:id/stats',
  },

  // Designs
  DESIGNS: {
    LIST: '/projects/:projectId/designs',
    CREATE: '/projects/:projectId/designs',
    GET: '/projects/:projectId/designs/:id',
    UPDATE: '/projects/:projectId/designs/:id',
    DELETE: '/projects/:projectId/designs/:id',
    VERSIONS: '/projects/:projectId/designs/:id/versions',
    EXPORT: '/projects/:projectId/designs/:id/export',
    IMPORT: '/projects/:projectId/designs/import',
    COLLABORATE: '/projects/:projectId/designs/:id/collaborate',
    COMMENTS: '/projects/:projectId/designs/:id/comments',
  },

  // Terraform
  TERRAFORM: {
    PLAN: '/terraform/plan',
    APPLY: '/terraform/apply',
    DESTROY: '/terraform/destroy',
    VALIDATE: '/terraform/validate',
    STATE: '/terraform/state/:designId',
    DRIFT: '/terraform/drift/:designId',
    WORKSPACES: '/terraform/workspaces',
  },

  // AI
  AI: {
    GENERATE: '/ai/generate',
    OPTIMIZE: '/ai/optimize',
    EXPLAIN: '/ai/explain',
    VALIDATE: '/ai/validate',
    MODELS: '/ai/models',
    TEMPLATES: '/ai/templates',
  },

  // System
  SYSTEM: {
    HEALTH: '/health',
    METRICS: '/metrics',
    VERSION: '/version',
  },
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Authentication
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',

  // Rooms
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',

  // Design collaboration
  DESIGN_UPDATE: 'design_update',
  CURSOR_MOVE: 'cursor_move',
  NODE_SELECT: 'node_select',
  NODE_UPDATE: 'node_update',
  EDGE_UPDATE: 'edge_update',

  // User presence
  USER_JOIN: 'user_join',
  USER_LEAVE: 'user_leave',
  USER_TYPING: 'user_typing',

  // Notifications
  NOTIFICATION: 'notification',

  // Errors
  ERROR: 'error',
} as const;

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds to wait before retry
}

// File upload
export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: string;
}

// Health check
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    external: Record<string, 'healthy' | 'unhealthy'>;
  };
}

// Metrics
export interface MetricsResponse {
  timestamp: string;
  system: {
    cpu: number;
    memory: number;
    disk: number;
  };
  application: {
    activeUsers: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  business: {
    totalProjects: number;
    totalDesigns: number;
    aiGenerationsToday: number;
    terraformExecutionsToday: number;
  };
}
