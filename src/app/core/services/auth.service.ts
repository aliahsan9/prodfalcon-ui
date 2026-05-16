import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthResponse, LoginRequest, RegisterRequest, UserSession } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'prodfalcon-token';
  private readonly emailKey = 'prodfalcon-email';
  private readonly session = signal<UserSession | null>(this.readSession());

  readonly isAuthenticated = computed(() => !!this.session()?.token);
  readonly userEmail = computed(() => this.session()?.email ?? '');

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(payload: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => { if (res.success) this.persist(res.data); })
    );
  }

  register(payload: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap((res) => { if (res.success) this.persist(res.data); })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.emailKey);
    this.session.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.session()?.token ?? null;
  }

  private persist(data: AuthResponse): void {
    localStorage.setItem(this.tokenKey, data.token);
    localStorage.setItem(this.emailKey, data.email);
    this.session.set({ email: data.email, token: data.token });
  }

  private readSession(): UserSession | null {
    const token = localStorage.getItem(this.tokenKey);
    const email = localStorage.getItem(this.emailKey);
    return token && email ? { token, email } : null;
  }
}

