// Common types used across the application

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, any>;
  timestamp: string;
  path?: string;
  statusCode?: number;
}

// Cloud provider types
export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'oci';

export interface CloudCredentials {
  id: string;
  name: string;
  provider: CloudProvider;
  region?: string;
  credentials: Record<string, any>; // Encrypted
  isActive: boolean;
  lastValidated?: Date;
}

// Resource types
export interface ResourceMetadata {
  provider: CloudProvider;
  type: string;
  name: string;
  region?: string;
  tags?: Record<string, string>;
}

// Audit types
export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Permission types
export type Permission =
  | 'projects.create'
  | 'projects.read'
  | 'projects.update'
  | 'projects.delete'
  | 'designs.create'
  | 'designs.read'
  | 'designs.update'
  | 'designs.delete'
  | 'terraform.plan'
  | 'terraform.apply'
  | 'terraform.destroy'
  | 'ai.generate'
  | 'users.manage'
  | 'system.admin';

export interface Role extends BaseEntity {
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
}

// WebSocket types
export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  userId?: string;
  roomId?: string;
}

export interface WebSocketResponse<T = any> {
  type: string;
  payload: T;
  success: boolean;
  error?: string;
  timestamp: string;
}

// File upload types
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Search types
export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  facets?: string[];
  highlight?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  took: number; // milliseconds
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Configuration types
export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    aiGeneration: boolean;
    realTimeCollaboration: boolean;
    terraformExecution: boolean;
    multiCloud: boolean;
  };
  limits: {
    maxProjectsPerUser: number;
    maxDesignsPerProject: number;
    maxFileSize: number;
    maxConcurrentUsers: number;
  };
}

// Health check types
export interface HealthStatus {
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

// Metrics types
export interface Metrics {
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

// Security types
export interface SecurityEvent {
  id: string;
  type: 'login_failure' | 'suspicious_activity' | 'permission_denied' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}
