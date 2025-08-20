import { BaseEntity, CloudProvider } from './common';

// Design entity
export interface Design extends BaseEntity {
  name: string;
  description?: string;
  projectId: string;
  createdBy: string;
  isPublic: boolean;
  version: number;
  canvasData: CanvasData;
  terraformCode?: string;
  status: DesignStatus;
  tags: string[];
}

// Design status
export type DesignStatus = 'draft' | 'planned' | 'applied' | 'destroyed' | 'error';

// Canvas data structure
export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  metadata: CanvasMetadata;
}

// Canvas node (represents cloud resources)
export interface CanvasNode {
  id: string;
  type: string; // Resource type (e.g., 'aws_instance', 'aws_vpc')
  position: Position;
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
}

// Canvas edge (represents connections/dependencies)
export interface CanvasEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type?: EdgeType;
  animated?: boolean;
  label?: string;
  data?: EdgeData;
}

// Position
export interface Position {
  x: number;
  y: number;
}

// Viewport
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Canvas metadata
export interface CanvasMetadata {
  provider: CloudProvider;
  region: string;
  lastModified: Date;
  autoLayout: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

// Node data (resource configuration)
export interface NodeData {
  label: string;
  resourceType: string;
  provider: CloudProvider;
  configuration: Record<string, any>;
  validation?: ValidationResult;
  cost?: CostEstimate;
}

// Edge types
export type EdgeType = 'dependency' | 'network' | 'data' | 'security';

// Edge data
export interface EdgeData {
  type: EdgeType;
  configuration?: Record<string, any>;
  bidirectional?: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Cost estimate
export interface CostEstimate {
  monthly: number;
  currency: string;
  breakdown: CostBreakdown[];
  confidence: 'low' | 'medium' | 'high';
}

export interface CostBreakdown {
  service: string;
  amount: number;
  unit: string;
}

// Design creation/update DTOs
export interface CreateDesignRequest {
  name: string;
  description?: string;
  projectId: string;
  isPublic?: boolean;
  canvasData?: Partial<CanvasData>;
  tags?: string[];
}

export interface UpdateDesignRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  canvasData?: CanvasData;
  tags?: string[];
}

// Design version
export interface DesignVersion extends BaseEntity {
  designId: string;
  version: number;
  canvasData: CanvasData;
  terraformCode?: string;
  changelog: string;
  createdBy: string;
}

export interface CreateVersionRequest {
  changelog: string;
}

// Design collaboration
export interface DesignCollaboration extends BaseEntity {
  designId: string;
  userId: string;
  cursor?: Position;
  selection?: string[]; // Selected node IDs
  isActive: boolean;
  lastActivity: Date;
}

// Design export/import
export interface DesignExport {
  design: Design;
  versions: DesignVersion[];
  exportedAt: Date;
  format: ExportFormat;
}

export type ExportFormat = 'json' | 'terraform' | 'yaml' | 'image';

export interface ImportDesignRequest {
  data: string | object;
  format: ExportFormat;
  projectId: string;
  name?: string;
}

// Design comments
export interface DesignComment extends BaseEntity {
  designId: string;
  userId: string;
  content: string;
  position?: Position; // Position on canvas
  nodeId?: string; // Attached to specific node
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface CreateCommentRequest {
  content: string;
  position?: Position;
  nodeId?: string;
}