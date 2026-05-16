export interface ScanIssue {
  title: string;
  severity: string;
  filePath: string;
  ruleName: string;
  category: string;
  description?: string;
  ruleId?: string;
  lineNumber?: number;
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
  issuesBySeverity: Record<string, number>;
  topViolatedRules: Record<string, number>;
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
  latestScanResultId: number;
  scanCount: number;
  issueCount: number;
  trend: string;
}

export type ProjectHealth = 'Healthy' | 'Warning' | 'Critical';

