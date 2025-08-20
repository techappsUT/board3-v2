import { BaseEntity, CloudProvider } from './common';

// AI generation request
export interface AIGenerationRequest {
  prompt: string;
  provider: CloudProvider;
  region?: string;
  context?: AIContext;
  options?: AIOptions;
}

// AI context for better generation
export interface AIContext {
  existingResources?: string[];
  projectRequirements?: string;
  budget?: number;
  performance?: PerformanceRequirements;
  security?: SecurityRequirements;
  compliance?: ComplianceRequirements;
}

// Performance requirements
export interface PerformanceRequirements {
  expectedTraffic?: number;
  latencyRequirements?: number; // ms
  throughputRequirements?: number; // requests/second
  storageRequirements?: number; // GB
  computeRequirements?: string; // 'low', 'medium', 'high'
}

// Security requirements
export interface SecurityRequirements {
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  encryptionRequired?: boolean;
  vpnRequired?: boolean;
  complianceFrameworks?: string[];
  accessControls?: string[];
}

// Compliance requirements
export interface ComplianceRequirements {
  frameworks: string[]; // 'SOC2', 'HIPAA', 'PCI-DSS', 'GDPR'
  dataResidency?: string; // Country/region code
  auditLogging?: boolean;
  dataRetention?: number; // days
}

// AI generation options
export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  includeComments?: boolean;
  includeValidation?: boolean;
  includeCosts?: boolean;
  optimizeFor?: 'cost' | 'performance' | 'security' | 'compliance';
}

// AI generation response
export interface AIGenerationResponse {
  id: string;
  designData: AIGeneratedDesign;
  terraformCode: string;
  explanation: string;
  recommendations: AIRecommendation[];
  costEstimate?: CostEstimate;
  securityAnalysis?: SecurityAnalysis;
  processingTime: number; // ms
  confidence: number; // 0-1
}

// AI generated design
export interface AIGeneratedDesign {
  nodes: AIGeneratedNode[];
  edges: AIGeneratedEdge[];
  metadata: {
    provider: CloudProvider;
    region: string;
    generatedAt: Date;
    prompt: string;
  };
}

// AI generated node
export interface AIGeneratedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    resourceType: string;
    configuration: Record<string, any>;
    reasoning: string; // Why AI chose this configuration
  };
}

// AI generated edge
export interface AIGeneratedEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  reasoning: string; // Why this connection was made
}

// AI recommendation
export interface AIRecommendation {
  type: RecommendationType;
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  suggestion: string;
  impact: ImpactAnalysis;
  autoFixAvailable: boolean;
}

export type RecommendationType = 
  | 'cost_optimization'
  | 'security_improvement'
  | 'performance_enhancement'
  | 'compliance_requirement'
  | 'best_practice'
  | 'resource_sizing'
  | 'architecture_pattern';

// Impact analysis
export interface ImpactAnalysis {
  costImpact?: number; // Percentage change
  performanceImpact?: string;
  securityImpact?: string;
  complexityImpact?: 'low' | 'medium' | 'high';
  implementationEffort?: 'low' | 'medium' | 'high';
}

// Cost estimate
export interface CostEstimate {
  total: number;
  currency: string;
  period: 'hourly' | 'daily' | 'monthly' | 'yearly';
  breakdown: CostBreakdown[];
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
}

export interface CostBreakdown {
  service: string;
  resourceType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  usage: string;
}

// Security analysis
export interface SecurityAnalysis {
  score: number; // 0-100
  risks: SecurityRisk[];
  recommendations: SecurityRecommendation[];
  compliance: ComplianceStatus[];
}

export interface SecurityRisk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  mitigation: string;
  cve?: string;
}

export interface SecurityRecommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  implementationGuide: string;
}

export interface ComplianceStatus {
  framework: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  status: 'met' | 'not_met' | 'partial';
  evidence?: string;
}

// AI generation history
export interface AIGeneration extends BaseEntity {
  userId: string;
  projectId?: string;
  designId?: string;
  prompt: string;
  context: AIContext;
  options: AIOptions;
  response: AIGenerationResponse;
  used: boolean; // Whether the generation was used in a design
  feedback?: AIFeedback;
}

// AI feedback for improvement
export interface AIFeedback {
  rating: number; // 1-5
  helpful: boolean;
  accurate: boolean;
  complete: boolean;
  comments?: string;
  improvements?: string[];
}

// AI model information
export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  version: string;
  capabilities: ModelCapability[];
  supportedProviders: CloudProvider[];
  maxTokens: number;
  costPerToken: number;
  averageResponseTime: number; // ms
  availability: ModelAvailability;
}

export interface ModelCapability {
  type: string;
  description: string;
  accuracy: number; // 0-1
}

export interface ModelAvailability {
  status: 'available' | 'limited' | 'unavailable';
  regions: string[];
  limitations?: string[];
}

// AI prompt templates
export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: PromptVariable[];
  examples: PromptExample[];
  tags: string[];
  popularity: number;
}

export interface PromptVariable {
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  description: string;
  required: boolean;
  default?: any;
  options?: string[];
}

export interface PromptExample {
  name: string;
  description: string;
  variables: Record<string, any>;
  expectedOutput: string;
}

// AI training data
export interface AITrainingData {
  id: string;
  type: 'architecture_pattern' | 'best_practice' | 'common_mistake' | 'optimization';
  content: string;
  metadata: Record<string, any>;
  quality: number; // 0-1
  verified: boolean;
  source: string;
}

// API DTOs
export interface GenerateInfrastructureRequest {
  prompt: string;
  provider: CloudProvider;
  region?: string;
  context?: AIContext;
  options?: AIOptions;
}

export interface OptimizeDesignRequest {
  designId: string;
  optimizationGoals: ('cost' | 'performance' | 'security' | 'compliance')[];
  constraints?: Record<string, any>;
}

export interface ExplainDesignRequest {
  designId: string;
  focus?: 'architecture' | 'security' | 'costs' | 'compliance';
}

export interface ValidateDesignRequest {
  designId: string;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
}