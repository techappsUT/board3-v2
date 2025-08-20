import { BaseEntity, CloudProvider } from './common';

// Terraform state
export interface TerraformState extends BaseEntity {
  designId: string;
  version: string;
  provider: CloudProvider;
  backend: TerraformBackend;
  resources: TerraformResource[];
  outputs: Record<string, TerraformOutput>;
  status: TerraformStatus;
  lastApplied?: Date;
  lastPlan?: Date;
  drift: DriftStatus;
}

// Terraform backend configuration
export interface TerraformBackend {
  type: 'local' | 'remote' | 's3' | 'azurerm' | 'gcs';
  config: Record<string, any>;
  encrypted: boolean;
  lockingEnabled: boolean;
}

// Terraform resource
export interface TerraformResource {
  address: string;
  type: string;
  name: string;
  provider: string;
  instances: TerraformInstance[];
  dependencies: string[];
  mode: 'managed' | 'data';
}

// Terraform instance
export interface TerraformInstance {
  attributes: Record<string, any>;
  dependencies: string[];
  status: ResourceStatus;
  tainted?: boolean;
}

// Terraform output
export interface TerraformOutput {
  value: any;
  type: string;
  sensitive: boolean;
  description?: string;
}

// Terraform status
export type TerraformStatus = 'pending' | 'planning' | 'planned' | 'applying' | 'applied' | 'destroying' | 'destroyed' | 'error';

// Resource status
export type ResourceStatus = 'creating' | 'created' | 'updating' | 'updated' | 'deleting' | 'deleted' | 'error';

// Drift detection
export type DriftStatus = 'none' | 'detected' | 'checking' | 'error';

export interface DriftResult {
  hasDrift: boolean;
  driftedResources: DriftedResource[];
  checkedAt: Date;
  nextCheck?: Date;
}

export interface DriftedResource {
  address: string;
  type: string;
  changes: ResourceChange[];
  severity: 'low' | 'medium' | 'high';
}

export interface ResourceChange {
  attribute: string;
  before: any;
  after: any;
  action: 'create' | 'update' | 'delete' | 'replace';
}

// Terraform plan
export interface TerraformPlan {
  id: string;
  designId: string;
  planData: string; // JSON plan
  summary: PlanSummary;
  createdAt: Date;
  createdBy: string;
  applied: boolean;
  appliedAt?: Date;
  appliedBy?: string;
}

export interface PlanSummary {
  toAdd: number;
  toChange: number;
  toDestroy: number;
  resources: PlannedResource[];
  estimatedCost?: number;
  warnings: string[];
  errors: string[];
}

export interface PlannedResource {
  address: string;
  action: 'create' | 'update' | 'delete' | 'replace' | 'read';
  resourceType: string;
  name: string;
  changes?: ResourceChange[];
}

// Terraform execution
export interface TerraformExecution extends BaseEntity {
  designId: string;
  planId?: string;
  type: ExecutionType;
  status: ExecutionStatus;
  output: string;
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  autoApproved: boolean;
}

export type ExecutionType = 'plan' | 'apply' | 'destroy' | 'validate' | 'fmt' | 'init';
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// Terraform configuration
export interface TerraformConfig {
  version: string;
  providers: ProviderConfig[];
  variables: VariableConfig[];
  outputs: OutputConfig[];
  modules: ModuleConfig[];
}

export interface ProviderConfig {
  name: string;
  version?: string;
  configuration: Record<string, any>;
  alias?: string;
}

export interface VariableConfig {
  name: string;
  type: string;
  description?: string;
  default?: any;
  validation?: ValidationRule[];
  sensitive?: boolean;
}

export interface OutputConfig {
  name: string;
  value: string;
  description?: string;
  sensitive?: boolean;
  depends_on?: string[];
}

export interface ModuleConfig {
  name: string;
  source: string;
  version?: string;
  variables: Record<string, any>;
}

export interface ValidationRule {
  condition: string;
  error_message: string;
}

// Terraform workspace
export interface TerraformWorkspace extends BaseEntity {
  name: string;
  projectId: string;
  environment: 'dev' | 'staging' | 'prod';
  provider: CloudProvider;
  backend: TerraformBackend;
  variables: Record<string, WorkspaceVariable>;
  autoApply: boolean;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
}

export interface WorkspaceVariable {
  value: string;
  sensitive: boolean;
  category: 'terraform' | 'env';
  description?: string;
}

// API DTOs
export interface CreatePlanRequest {
  designId: string;
  workspace?: string;
  variables?: Record<string, any>;
  autoApply?: boolean;
}

export interface ApplyPlanRequest {
  planId: string;
  autoApprove?: boolean;
}

export interface DestroyRequest {
  designId: string;
  workspace?: string;
  autoApprove?: boolean;
}

export interface ValidateRequest {
  designId: string;
  workspace?: string;
}

export interface CheckDriftRequest {
  designId: string;
  workspace?: string;
}

// Terraform module
export interface TerraformModule {
  id: string;
  name: string;
  description: string;
  source: string;
  version: string;
  provider: CloudProvider;
  category: string;
  tags: string[];
  variables: VariableConfig[];
  outputs: OutputConfig[];
  examples: ModuleExample[];
  documentation: string;
  verified: boolean;
  downloads: number;
  rating: number;
}

export interface ModuleExample {
  name: string;
  description: string;
  code: string;
  variables: Record<string, any>;
}