import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { DashboardSummary, ScanResult, ScanTrend, ScanUploadResponse } from '../models/scan.model';

@Injectable({ providedIn: 'root' })
export class ScanService {
  constructor(private readonly http: HttpClient) {}

  uploadZip(file: File): Observable<ApiResponse<ScanUploadResponse>> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ApiResponse<ScanUploadResponse>>(`${environment.apiUrl}/scan/upload`, form);
  }

  getScan(scanResultId: number): Observable<ApiResponse<ScanResult>> {
    return this.http.get<ApiResponse<ScanResult>>(`${environment.apiUrl}/scan/${scanResultId}`);
  }

  getSummary(): Observable<ApiResponse<DashboardSummary>> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${environment.apiUrl}/dashboard/summary`);
  }

  getTrends(): Observable<ApiResponse<ScanTrend[]>> {
    return this.http.get<ApiResponse<ScanTrend[]>>(`${environment.apiUrl}/dashboard/trends`);
  }
}

