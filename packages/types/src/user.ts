import { BaseEntity, Role } from './common';

// User entity
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  company?: string;
  jobTitle?: string;
  timezone?: string;
  locale?: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string; // Encrypted
  backupCodes?: string[]; // Encrypted
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
  deactivatedBy?: string;
  passwordChangedAt?: Date;
  agreedToTermsAt?: Date;
  roles: Role[];
}

// User creation/update DTOs
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  timezone?: string;
  locale?: string;
  roles?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  timezone?: string;
  locale?: string;
  avatar?: string;
}

export interface UpdateUserRolesRequest {
  roles: string[];
}

export interface DeactivateUserRequest {
  reason: string;
}

// User preferences
export interface UserPreferences extends BaseEntity {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: {
    projectUpdates: boolean;
    designShared: boolean;
    collaboratorAdded: boolean;
    terraformResults: boolean;
    securityAlerts: boolean;
    productUpdates: boolean;
  };
  dashboardLayout: {
    widgets: Array<{
      id: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      visible: boolean;
    }>;
  };
  editorSettings: {
    autoSave: boolean;
    autoSaveInterval: number; // seconds
    gridSize: number;
    snapToGrid: boolean;
    showGrid: boolean;
    showMinimap: boolean;
  };
}

// User activity
export interface UserActivity extends BaseEntity {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

// User invitation
export interface UserInvitation extends BaseEntity {
  email: string;
  invitedBy: string;
  roles: string[];
  message?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
}

export interface InviteUserRequest {
  email: string;
  roles: string[];
  message?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

// User statistics
export interface UserStats {
  totalProjects: number;
  totalDesigns: number;
  aiGenerationsCount: number;
  terraformExecutionsCount: number;
  collaborationsCount: number;
  lastActivityAt: Date;
  joinedAt: Date;
  storageUsed: number; // bytes
  storageLimit: number; // bytes
}

// User team/organization
export interface UserTeam extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
  members: UserTeamMember[];
  settings: {
    allowInvitations: boolean;
    requireApproval: boolean;
    maxMembers: number;
  };
}

export interface UserTeamMember extends BaseEntity {
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  invitedBy?: string;
}

// User sessions
export interface UserSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isCurrent: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

// User export data (GDPR compliance)
export interface UserExportData {
  user: Omit<User, 'mfaSecret' | 'backupCodes'>;
  preferences: UserPreferences;
  activities: UserActivity[];
  projects: Array<{
    id: string;
    name: string;
    role: string;
    createdAt: Date;
  }>;
  designs: Array<{
    id: string;
    name: string;
    projectId: string;
    createdAt: Date;
  }>;
  apiKeys: Array<{
    id: string;
    name: string;
    createdAt: Date;
    lastUsedAt?: Date;
  }>;
  exportedAt: Date;
}

// User deletion (GDPR compliance)
export interface UserDeletionRequest {
  reason: string;
  keepProjects: boolean; // Transfer to organization or delete
  keepDesigns: boolean;
}

export interface UserDeletionResult {
  deletedAt: Date;
  projectsHandled: number;
  designsHandled: number;
  dataAnonymized: boolean;
}
