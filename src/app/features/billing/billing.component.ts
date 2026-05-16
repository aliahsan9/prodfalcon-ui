import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { BillingService } from '../../core/services/billing.service';
import { ToastService } from '../../core/services/toast.service';
import { SubscriptionTier } from '../../core/models/billing.model';

@Component({
  selector: 'app-billing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1">Billing</h1>
    <p class="text-muted mb-4">Manage your subscription and usage</p>

    <div class="row g-3 mb-4">
      @for (plan of plans; track plan.name) {
        <div class="col-md-4">
          <div class="pf-card h-100" [class.border-primary]="plan.tier === currentTier()">
            <h2 class="h5">{{ plan.name }}</h2>
            <p class="display-6 fw-bold">{{ plan.price }}<span class="fs-6 text-muted">/mo</span></p>
            <ul class="small text-muted list-unstyled mb-3">
              @for (f of plan.features; track f) { <li><i class="bi bi-check2 text-success me-1"></i>{{ f }}</li> }
            </ul>
            <button class="btn w-100" [class.btn-primary]="plan.tier !== currentTier()" [class.btn-outline-secondary]="plan.tier === currentTier()"
                    [disabled]="plan.tier === currentTier()" (click)="upgrade(plan.tier)">
              {{ plan.tier === currentTier() ? 'Current plan' : 'Upgrade' }}
            </button>
          </div>
        </div>
      }
    </div>

    <div class="pf-card">
      <h2 class="h6">Usage</h2>
      <p class="mb-2">Scans used: {{ usage().scansUsed }} / {{ usageLabel() }}</p>
      <div class="progress" style="height: 8px;">
        <div class="progress-bar" [style.width.%]="usagePercent()"></div>
      </div>
    </div>
  `
})
export class BillingComponent implements OnInit {
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  readonly currentTier = signal<SubscriptionTier>('Free');
  readonly usage = signal({ scansUsed: 0, scansRemaining: 5 });

  readonly plans = [
    { name: 'Free', tier: 'Free' as SubscriptionTier, price: '$0', features: ['5 scans/month', 'Basic rules', 'Dashboard'] },
    { name: 'Pro', tier: 'Pro' as SubscriptionTier, price: '$29', features: ['100 scans', 'AI suggestions', 'CI/CD', 'Reports'] },
    { name: 'Enterprise', tier: 'Enterprise' as SubscriptionTier, price: '$99', features: ['Unlimited scans', 'PR auto-fix', 'Compliance', 'API access'] }
  ];

  ngOnInit(): void {
    this.billing.loadSubscription().subscribe({
      next: (r) => {
        if (r.success) {
          this.currentTier.set(r.data.tier);
          this.usage.set(r.data.usage);
        }
      }
    });
  }

  usageLabel(): string {
    const lim = this.billing.subscription()?.limits.scansPerMonth ?? 5;
    return lim < 0 ? 'Unlimited' : String(lim);
  }

  usagePercent(): number {
    const lim = this.billing.subscription()?.limits.scansPerMonth ?? 5;
    if (lim <= 0) return 10;
    return Math.min(100, (this.usage().scansUsed / lim) * 100);
  }

  upgrade(tier: SubscriptionTier): void {
    this.billing.createCheckout(0, tier).subscribe({
      next: (r) => {
        if (r.success) {
          this.toast.success('Checkout session created (stub).');
          window.open(r.data.checkoutUrl, '_blank');
        }
      }
    });
  }
}
