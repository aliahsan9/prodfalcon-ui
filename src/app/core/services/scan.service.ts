import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AiAskResponse,
  ArchitectureGraph,
  DashboardSummary,
  ProjectIntelligence,
  ThreatModel,
  PagedResult,
  ScanComparison,
  ScanHistoryItem,
  ScanIssue,
  ScanResult,
  ScanTrend,
  ScanUploadResponse
} from '../models/scan.model';

@Injectable({ providedIn: 'root' })
export class ScanService {
  constructor(private readonly http: HttpClient) {}

  uploadZip(file: File): Observable<HttpEvent<ApiResponse<ScanUploadResponse>>> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ApiResponse<ScanUploadResponse>>(`${environment.apiUrl}/scan/upload`, form, {
      reportProgress: true,
      observe: 'events'
    });
  }

  scanGitHub(repositoryUrl: string, branch: string, accessToken: string): Observable<ApiResponse<ScanUploadResponse>> {
    return this.http.post<ApiResponse<ScanUploadResponse>>(`${environment.apiUrl}/scan/github`, {
      repositoryUrl,
      branch: branch || null,
      accessToken: accessToken || null,
      configuration: { fullAudit: true }
    });
  }

  getScan(scanResultId: number): Observable<ApiResponse<ScanResult>> {
    return this.http.get<ApiResponse<ScanResult>>(`${environment.apiUrl}/scan/${scanResultId}`);
  }

  cancelScan(scanResultId: number): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${environment.apiUrl}/scan/${scanResultId}/cancel`, {});
  }

  getHistory(page = 1, projectId?: string): Observable<ApiResponse<PagedResult<ScanHistoryItem>>> {
    const params: Record<string, string> = { page: String(page), pageSize: '20' };
    if (projectId) params['projectId'] = projectId;
    return this.http.get<ApiResponse<PagedResult<ScanHistoryItem>>>(`${environment.apiUrl}/scan/history`, { params });
  }

  getFindings(filters: Record<string, string>): Observable<ApiResponse<PagedResult<ScanIssue>>> {
    return this.http.get<ApiResponse<PagedResult<ScanIssue>>>(`${environment.apiUrl}/scan/findings`, { params: filters });
  }

  updateFinding(id: number, status: string, notes: string): Observable<ApiResponse<ScanIssue>> {
    return this.http.patch<ApiResponse<ScanIssue>>(`${environment.apiUrl}/scan/findings/${id}`, { status, notes });
  }

  compare(baselineId: number, currentId: number): Observable<ApiResponse<ScanComparison>> {
    return this.http.get<ApiResponse<ScanComparison>>(`${environment.apiUrl}/scan/compare`, {
      params: { baselineId, currentId }
    });
  }

  downloadReport(scanResultId: number, format: 'json' | 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/scan/${scanResultId}/report`, {
      params: { format },
      responseType: 'blob'
    });
  }

  getConversation(scanResultId: number): Observable<ApiResponse<{ role: string; content: string }[]>> {
    return this.http.get<ApiResponse<{ role: string; content: string }[]>>(
      `${environment.apiUrl}/scan/${scanResultId}/conversation`);
  }

  ask(scanResultId: number, question: string, findingId?: number): Observable<ApiResponse<AiAskResponse>> {
    return this.http.post<ApiResponse<AiAskResponse>>(`${environment.apiUrl}/ai/ask`, {
      scanResultId,
      question,
      findingId: findingId ?? null
    });
  }

  getIntelligence(scanResultId: number): Observable<ApiResponse<ProjectIntelligence>> {
    return this.http.get<ApiResponse<ProjectIntelligence>>(`${environment.apiUrl}/scan/${scanResultId}/intelligence`);
  }

  getArchitecture(scanResultId: number): Observable<ApiResponse<ArchitectureGraph>> {
    return this.http.get<ApiResponse<ArchitectureGraph>>(`${environment.apiUrl}/scan/${scanResultId}/architecture`);
  }

  getThreats(scanResultId: number): Observable<ApiResponse<ThreatModel>> {
    return this.http.get<ApiResponse<ThreatModel>>(`${environment.apiUrl}/scan/${scanResultId}/threats`);
  }

  getSummary(): Observable<ApiResponse<DashboardSummary>> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${environment.apiUrl}/dashboard/summary`);
  }

  getTrends(): Observable<ApiResponse<ScanTrend[]>> {
    return this.http.get<ApiResponse<ScanTrend[]>>(`${environment.apiUrl}/dashboard/trends`);
  }
}
