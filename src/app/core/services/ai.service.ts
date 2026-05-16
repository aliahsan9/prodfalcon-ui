import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiSuggestionCard, AiSuggestions } from '../models/ai.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private readonly http: HttpClient) {}

  getSuggestions(scanResultId: number): Observable<ApiResponse<AiSuggestions>> {
    return this.http.post<ApiResponse<AiSuggestions>>(`${environment.apiUrl}/ai/suggestions`, { scanResultId });
  }

  toCards(data: AiSuggestions): AiSuggestionCard[] {
    const cards: AiSuggestionCard[] = [];

    data.fixSuggestions.forEach((s, i) => cards.push({
      title: `Fix ${i + 1}`,
      category: 'fix',
      description: s,
      severityImpact: 'High',
      beforeCode: '// problematic pattern',
      afterCode: '// recommended fix'
    }));

    data.securityImprovements.forEach((s, i) => cards.push({
      title: `Security ${i + 1}`,
      category: 'security',
      description: s,
      severityImpact: 'Critical',
      beforeCode: 'password = "plain-text";',
      afterCode: 'password = configuration["Secret"];'
    }));

    data.refactoringRecommendations.forEach((s, i) => cards.push({
      title: `Refactor ${i + 1}`,
      category: 'refactor',
      description: s,
      severityImpact: 'Medium',
      beforeCode: 'static class Helper { }',
      afterCode: 'services.AddScoped<IHelper, Helper>();'
    }));

    data.productionReadinessAdvice.forEach((s, i) => cards.push({
      title: `Production ${i + 1}`,
      category: 'production',
      description: s,
      severityImpact: 'Medium',
      beforeCode: 'app.UseSwagger();',
      afterCode: 'if (env.IsDevelopment()) app.UseSwagger();'
    }));

    return cards;
  }
}

