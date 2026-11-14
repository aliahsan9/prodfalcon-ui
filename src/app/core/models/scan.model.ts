export interface ScanIssue {
  id?: number;
  title: string;
  severity: string;
  filePath: string;
  ruleName: string;
  ruleId?: string;
  category: string;
  description?: string;
  lineNumber?: number;
  columnNumber?: number;
  confidence?: string;
  cwe?: string;
  cve?: string;
  evidence?: string;
  impact?: string;
  remediation?: string;
  secureExample?: string;
  status?: string;
  detectionMethod?: string;
  references?: string;
  notes?: string;
  fixSuggestion?: string;
}

export interface ScanResult {
  projectId: string;
  scanResultId: number;
  projectPath: string;
  overallScore: number;
  securityScore: number;
  maintainabilityScore: number;
  performanceScore: number;
  productionReadinessScore: number;
  totalIssues: number;
  status: string;
  durationMs: number;
  stage?: string;
  stageMessage?: string;
  riskLevel?: string;
  previousScore?: number | null;
  scoreChange?: number | null;
  fileCount?: number;
  technologies?: string[];
  sourceType?: string;
  repositoryUrl?: string;
  branch?: string;
  projectName?: string;
  scoringNote?: string;
  issues: ScanIssue[];
}

export interface ScanUploadResponse {
  projectId: string;
  storageRoot: string;
  uploadedZip: string;
  extractedProject: string;
  scan: ScanResult;
}

export interface DashboardSummary {
  totalProjects: number;
  totalScans: number;
  totalIssues: number;
  averageScore: number;
  averageSecurityScore: number;
  averageMaintainabilityScore: number;
  averagePerformanceScore: number;
  averageProductionReadinessScore: number;
  architectureScore: number;
  documentationScore: number;
  testCoverageScore: number;
  technicalDebtScore: number;
  codeSmellsScore: number;
  complexityScore: number;
  bugRiskScore: number;
  criticalVulnerabilities?: number;
  highVulnerabilities?: number;
  mediumVulnerabilities?: number;
  lowVulnerabilities?: number;
  informationalFindings?: number;
  resolvedIssues?: number;
  openIssues?: number;
  issuesBySeverity: Record<string, number>;
  issuesByCategory: Record<string, number>;
  topViolatedRules: Record<string, number>;
  aiRecommendations: string[];
}

export interface ScanTrend {
  date: string;
  averageScore: number;
  scanCount: number;
  issueCount: number;
}

export interface ProjectSummary {
  projectId: string;
  fileName: string;
  uploadedAt: string;
  status: string;
  latestScore: number;
  latestSecurityScore?: number;
  latestMaintainabilityScore?: number;
  latestPerformanceScore?: number;
  latestProductionReadinessScore?: number;
  latestScanResultId: number;
  scanCount: number;
  issueCount: number;
  trend: string;
  sourceType?: string;
  repositoryUrl?: string;
  branch?: string;
  displayName?: string;
  latestDurationMs?: number;
  latestStatus?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ScanHistoryItem {
  scanResultId: number;
  projectId: string;
  projectName: string;
  sourceType: string;
  repositoryUrl?: string;
  branch?: string;
  createdAt: string;
  status: string;
  stage: string;
  stageMessage: string;
  score: number;
  riskLevel: string;
  durationMs: number;
  issueCount: number;
  previousScore?: number | null;
}

export interface ScanComparison {
  baselineId: number;
  currentId: number;
  baselineScore: number;
  currentScore: number;
  scoreChange: number;
  introduced: ScanIssue[];
  resolved: ScanIssue[];
  unchanged: ScanIssue[];
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: string;
  filePath: string;
  description: string;
  kind: string;
  risks: string[];
}

export interface ArchitectureEdge {
  source: string;
  target: string;
  label: string;
  kind: string;
  evidence: string;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  note: string;
}

export interface ProjectIntelligence {
  purpose: string;
  purposeKind: string;
  organization: string;
  languages: string[];
  technologies: { name: string; version: string; evidence: string }[];
  entryPoints: string[];
  endpoints: { verb: string; route: string; filePath: string; lineNumber: number }[];
  databases: string[];
  authentication: string[];
  dependencies: { name: string; version: string; ecosystem: string }[];
  answers: string[];
  facts: { statement: string; kind: string; evidence: string }[];
  inferences: { statement: string; kind: string; evidence: string }[];
}

export interface ThreatItem {
  id: string;
  stride: string;
  title: string;
  description: string;
  component: string;
  scenario: string;
  impact: string;
  likelihood: string;
  evidence: string;
  mitigation: string;
  classification: string;
  exploitConfirmed: boolean;
}

export interface ThreatModel {
  threats: ThreatItem[];
  diagram: ArchitectureGraph;
  note: string;
}

export interface AiAskResponse {
  scanResultId: number;
  answer: string;
  usedExternalModel: boolean;
  grounding: string;
}

export type ProjectHealth = 'Healthy' | 'Warning' | 'Critical';

export interface HealthMetric {
  key: string;
  label: string;
  icon: string;
  score: number;
  description: string;
}
