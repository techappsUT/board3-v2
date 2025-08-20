import { BaseEntity, CloudProvider } from './common';

// Project entity
export interface Project extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  tags: string[];
  settings: ProjectSettings;
  members: ProjectMember[];
  cloudCredentials: string[]; // Array of credential IDs
}

// Project settings
export interface ProjectSettings {
  defaultProvider: CloudProvider;
  defaultRegion: string;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  enableAI: boolean;
  enableCollaboration: boolean;
  maxConcurrentUsers: number;
  terraformVersion: string;
}

// Project member
export interface ProjectMember extends BaseEntity {
  projectId: string;
  userId: string;
  role: ProjectRole;
  permissions: ProjectPermission[];
  invitedBy?: string;
  joinedAt: Date;
}

// Project roles
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';

// Project permissions
export type ProjectPermission = 
  | 'project.read'
  | 'project.update'
  | 'project.delete'
  | 'project.share'
  | 'designs.create'
  | 'designs.read'
  | 'designs.update'
  | 'designs.delete'
  | 'terraform.plan'
  | 'terraform.apply'
  | 'terraform.destroy'
  | 'members.invite'
  | 'members.remove';

// Project creation/update DTOs
export interface CreateProjectRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
  cloudCredentials?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
}

// Project invitation
export interface ProjectInvitation extends BaseEntity {
  projectId: string;
  email: string;
  role: ProjectRole;
  permissions: ProjectPermission[];
  invitedBy: string;
  message?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
}

export interface InviteToProjectRequest {
  email: string;
  role: ProjectRole;
  permissions?: ProjectPermission[];
  message?: string;
}

// Project statistics
export interface ProjectStats {
  totalDesigns: number;
  totalMembers: number;
  terraformExecutions: number;
  aiGenerations: number;
  lastActivity: Date;
  storageUsed: number; // bytes
}

// Project template
export interface ProjectTemplate extends BaseEntity {
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
  template: {
    settings: ProjectSettings;
    designs: any[]; // Design templates
    resources: any[]; // Resource templates
  };
}