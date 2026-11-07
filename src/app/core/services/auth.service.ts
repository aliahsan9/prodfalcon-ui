import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserSession
} from '../models/auth.model';

const SESSION_KEY = 'prodfalcon-session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly session = signal<UserSession | null>(this.readSession());

  readonly isAuthenticated = computed(() => !!this.session()?.token);

  readonly userEmail = computed(() => this.session()?.email ?? '');

  readonly fullName = computed(() => this.session()?.fullName?.trim() ?? '');

  readonly displayName = computed(() => {
    const name = this.fullName();
    if (name) return name;
    const email = this.userEmail();
    if (!email) return 'there';
    const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (!local) return 'there';
    return local.replace(/\b[a-z]/g, (char) => char.toUpperCase());
  });

  readonly authState = computed(() => this.session());

  readonly tenantId = computed(() => this.session()?.tenantId ?? '');

  readonly organization = computed(() => this.session()?.organization ?? '');

  readonly role = computed(() => this.session()?.role ?? '');

  readonly plan = computed(() => this.session()?.plan ?? 'Free');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/auth/login`,
      payload
    ).pipe(
      tap((res) => this.persist(res))
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/auth/register`,
      payload
    ).pipe(
      tap((res) => this.persist(res))
    );
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('prodfalcon-token');
    localStorage.removeItem('prodfalcon-email');
    this.session.set(null);
    this.router.navigateByUrl('/auth/login');
  }

  getToken(): string | null {
    return this.session()?.token ?? null;
  }

  handleUnauthorized(): void {
    this.logout();
  }

  handleForbidden(): void {
    this.router.navigateByUrl('/dashboard');
  }

  private persist(data: AuthResponse): void {
    const session: UserSession = {
      email: data.email,
      token: data.token,
      fullName: data.fullName ?? '',
      tenantId: data.tenantId,
      organization: data.organization ?? '',
      role: data.role ?? '',
      plan: data.plan ?? 'Free',
      isSuperAdmin: !!data.isSuperAdmin
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  private readSession(): UserSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserSession;
        if (parsed?.token && parsed?.email && parsed?.tenantId) {
          return parsed;
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    // Legacy keys — force re-login so JWT includes tenant claims.
    localStorage.removeItem('prodfalcon-token');
    localStorage.removeItem('prodfalcon-email');
    return null;
  }
}
