export interface AiSuggestions {
  scanResultId: number;
  fixSuggestions: string[];
  refactoringRecommendations: string[];
  securityImprovements: string[];
  productionReadinessAdvice: string[];
  summary: string;
}

export interface RemediationProposal {
  id: number;
  scanResultId: number;
  scanIssueId: number;
  ruleId: string;
  title: string;
  severity: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  explanation: string;
  secureSuggestion: string;
  originalSnippet: string;
  patchedSnippet: string;
  diffText: string;
  status: string;
  usedExternalModel: boolean;
  grounding: string;
  decisionNote?: string;
}

export interface RemediationPlan {
  scanResultId: number;
  summary: string;
  proposals: RemediationProposal[];
}

export interface AiSuggestionCard {
  title: string;
  category: 'fix' | 'refactor' | 'security' | 'production';
  description: string;
  severityImpact: string;
  beforeCode: string;
  afterCode: string;
}

