export interface AiSuggestions {
  scanResultId: number;
  fixSuggestions: string[];
  refactoringRecommendations: string[];
  securityImprovements: string[];
  productionReadinessAdvice: string[];
  summary: string;
}

export interface AiSuggestionCard {
  title: string;
  category: 'fix' | 'refactor' | 'security' | 'production';
  description: string;
  severityImpact: string;
  beforeCode: string;
  afterCode: string;
}

