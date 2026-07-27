import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { SubscriptionInfo } from '../models/billing.model';

@Injectable({ providedIn: 'root' })
export class BillingService {
  readonly subscription = signal<SubscriptionInfo | null>(null);

  constructor(private readonly http: HttpClient) {}

  loadSubscription(): Observable<ApiResponse<SubscriptionInfo>> {
    return this.http
      .get<ApiResponse<SubscriptionInfo>>(`${environment.apiUrl}/billing/subscription`)
      .pipe(tap((res) => { if (res.success) this.subscription.set(res.data); }));
  }

  createCheckout(tier: string): Observable<ApiResponse<{ checkoutUrl: string }>> {
    return this.http.post<ApiResponse<{ checkoutUrl: string }>>(`${environment.apiUrl}/stripe/checkout`, {
      tier: tier === 'Pro' ? 1 : tier === 'Enterprise' ? 2 : 0
    });
  }

  isProFeature(): boolean {
    const tier = this.subscription()?.tier ?? 'Free';
    return tier === 'Pro' || tier === 'Enterprise';
  }
}
