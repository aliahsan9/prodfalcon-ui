import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from './auth.service';

export interface GitHubConnection {
  connected: boolean;
  login?: string;
  avatarUrl?: string;
  scopes?: string;
  connectedAt?: string;
  oauthConfigured: boolean;
}

export interface GitHubRepository {
  owner: string;
  name: string;
  description?: string;
  defaultBranch: string;
  private: boolean;
  language?: string;
  htmlUrl: string;
  updatedAt?: string;
}

export interface PullRequestScan {
  id: number;
  owner: string;
  name: string;
  number: number;
  title: string;
  branch?: string;
  headSha?: string;
  status: string;
  scanResultId?: number;
  summary?: string;
  source: string;
  createdAt: string;
  gatePassed: boolean;
}

export interface SecurityPolicy {
  enabled: boolean;
  failOnCritical: boolean;
  failOnHigh: boolean;
  maxOpenCritical: number;
  maxOpenHigh: number;
  minOverallScore: number;
  minSecurityScore: number;
  preventScoreRegression: boolean;
  failOnNewSecrets: boolean;
  updatedAt?: string;
  rules: string[];
}

export interface CollaborationNote {
  id: number;
  scanResultId?: number;
  projectId?: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TeamMember {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  invitedAt: string;
  joinedAt?: string;
}

export interface AnalyticsPoint {
  day: string;
  scans: number;
  averageScore: number;
  openCritical: number;
  openHigh: number;
}

export interface ProjectRisk {
  projectId: string;
  name: string;
  repositoryUrl?: string;
  latestScore: number;
  securityScore: number;
  openCritical: number;
  openHigh: number;
  trend: string;
  latestScanResultId?: number;
  status: string;
}

export interface AnalyticsOverview {
  days: number;
  scanCount: number;
  averageScore: number;
  scoreChange: number;
  openCritical: number;
  openHigh: number;
  resolvedIssues: number;
  points: AnalyticsPoint[];
  projects: ProjectRisk[];
  recentGates: PullRequestScan[];
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  connection(): Observable<ApiResponse<GitHubConnection>> {
    return this.http.get<ApiResponse<GitHubConnection>>(`${environment.apiUrl}/github/connection`);
  }

  startOAuth(): Observable<ApiResponse<{ url: string }>> {
    return this.http.get<ApiResponse<{ url: string }>>(`${environment.apiUrl}/github/oauth/start`);
  }

  connectToken(accessToken: string): Observable<ApiResponse<GitHubConnection>> {
    return this.http.post<ApiResponse<GitHubConnection>>(`${environment.apiUrl}/github/connection`, { accessToken });
  }

  disconnect(): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${environment.apiUrl}/github/connection`);
  }

  repositories(): Observable<ApiResponse<GitHubRepository[]>> {
    return this.http.get<ApiResponse<GitHubRepository[]>>(`${environment.apiUrl}/github/repos`);
  }

  scanRepository(owner: string, name: string, branch?: string): Observable<ApiResponse<{ projectId: string; scanResultId: number }>> {
    return this.http.post<ApiResponse<{ projectId: string; scanResultId: number }>>(`${environment.apiUrl}/github/repos/scan`, { owner, name, branch });
  }

  pullRequests(): Observable<ApiResponse<PullRequestScan[]>> {
    return this.http.get<ApiResponse<PullRequestScan[]>>(`${environment.apiUrl}/github/pulls`);
  }

  scanPullRequest(owner: string, name: string, number: number): Observable<ApiResponse<PullRequestScan>> {
    return this.http.post<ApiResponse<PullRequestScan>>(`${environment.apiUrl}/github/pulls/scan`, { owner, name, number });
  }

  policy(): Observable<ApiResponse<SecurityPolicy>> {
    return this.http.get<ApiResponse<SecurityPolicy>>(`${environment.apiUrl}/policies`);
  }

  savePolicy(policy: SecurityPolicy): Observable<ApiResponse<SecurityPolicy>> {
    return this.http.put<ApiResponse<SecurityPolicy>>(`${environment.apiUrl}/policies`, policy);
  }

  notes(scanResultId?: number): Observable<ApiResponse<CollaborationNote[]>> {
    const query = scanResultId ? `?scanResultId=${scanResultId}` : '';
    return this.http.get<ApiResponse<CollaborationNote[]>>(`${environment.apiUrl}/collaboration/notes${query}`);
  }

  addNote(body: string, scanResultId?: number): Observable<ApiResponse<CollaborationNote>> {
    return this.http.post<ApiResponse<CollaborationNote>>(`${environment.apiUrl}/collaboration/notes`, { body, scanResultId });
  }

  members(): Observable<ApiResponse<TeamMember[]>> {
    return this.http.get<ApiResponse<TeamMember[]>>(`${environment.apiUrl}/tenants/members`);
  }

  invite(email: string, fullName: string, role: number): Observable<ApiResponse<{ inviteToken: string; email: string; expiresAt: string; role: string }>> {
    return this.http.post<ApiResponse<{ inviteToken: string; email: string; expiresAt: string; role: string }>>(
      `${environment.apiUrl}/tenants/members/invite`,
      { email, fullName, role });
  }

  updateRole(memberId: number, role: number): Observable<ApiResponse<TeamMember>> {
    return this.http.put<ApiResponse<TeamMember>>(`${environment.apiUrl}/tenants/members/${memberId}/role`, { role });
  }

  removeMember(memberId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${environment.apiUrl}/tenants/members/${memberId}`);
  }

  acceptInvite(token: string, password: string, fullName: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/tenants/invites/accept`, { token, password, fullName });
  }

  analytics(days: number): Observable<ApiResponse<AnalyticsOverview>> {
    return this.http.get<ApiResponse<AnalyticsOverview>>(`${environment.apiUrl}/analytics?days=${days}`);
  }

  canScan(): boolean {
    return ['Developer', 'SecurityReviewer', 'Admin', 'Owner'].includes(this.auth.role());
  }

  canAdminister(): boolean {
    return ['Admin', 'Owner'].includes(this.auth.role());
  }
}
