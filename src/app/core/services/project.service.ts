import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ProjectHealth, ProjectSummary } from '../models/scan.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private readonly http: HttpClient) {}

  getProjects(): Observable<ApiResponse<ProjectSummary[]>> {
    return this.http.get<ApiResponse<ProjectSummary[]>>(`${environment.apiUrl}/projects`);
  }

  getHealth(score: number, issueCount: number): ProjectHealth {
    if (score >= 80 && issueCount < 5) return 'Healthy';
    if (score >= 60) return 'Warning';
    return 'Critical';
  }
}

