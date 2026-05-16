import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiService } from '../../core/services/ai.service';
import { BillingService } from '../../core/services/billing.service';
import { AiSuggestionCard } from '../../core/models/ai.model';
import { UpgradeBannerComponent } from '../../shared/components/upgrade-banner/upgrade-banner.component';
import { LockedFeatureComponent } from '../../shared/components/locked-feature/locked-feature.component';

@Component({
  selector: 'app-ai-suggestions',
  standalone: true,
  imports: [UpgradeBannerComponent, LockedFeatureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1">AI code suggestions</h1>
    <p class="text-muted mb-4">Premium remediation powered by OpenAI</p>

    @if (!billing.isProFeature()) {
      <app-upgrade-banner class="mb-4 d-block" />
    }

    <app-locked-feature [locked]="!billing.isProFeature()">
      <div class="pf-card mb-3">
        <label class="form-label">Scan result ID</label>
        <div class="input-group">
          <input type="number" class="form-control" [value]="scanResultId()" (change)="setId($event)" />
          <button class="btn btn-primary" (click)="load()" [disabled]="loading()">Generate</button>
        </div>
      </div>

      @if (summary()) {
        <div class="pf-card mb-3 border-primary">
          <p class="mb-0 fw-semibold">{{ summary() }}</p>
        </div>
      }

      <div class="row g-3">
        @for (card of cards(); track card.title + card.description) {
          <div class="col-lg-6">
            <div class="pf-card h-100">
              <div class="d-flex justify-content-between mb-2">
                <span class="badge text-bg-primary">{{ card.category }}</span>
                <span class="small text-danger">{{ card.severityImpact }} impact</span>
              </div>
              <h2 class="h6">{{ card.title }}</h2>
              <p class="small text-muted">{{ card.description }}</p>
              <div class="row g-2">
                <div class="col-6">
                  <div class="small text-muted mb-1">Before</div>
                  <pre class="code-snippet">{{ card.beforeCode }}</pre>
                </div>
                <div class="col-6">
                  <div class="small text-muted mb-1">After</div>
                  <pre class="code-snippet code-after">{{ card.afterCode }}</pre>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </app-locked-feature>
  `,
  styles: [`
    .code-snippet {
      background: #0f172a; border-radius: 8px; padding: .75rem;
      font-size: .75rem; color: #fca5a5; margin: 0;
    }
    .code-after { color: #86efac; }
  `]
})
export class AiSuggestionsComponent implements OnInit {
  readonly billing = inject(BillingService);
  private readonly ai = inject(AiService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly scanResultId = signal(0);
  readonly cards = signal<AiSuggestionCard[]>([]);
  readonly summary = signal('');

  ngOnInit(): void {
    this.billing.loadSubscription().subscribe();
    const q = Number(this.route.snapshot.queryParamMap.get('scanResultId'));
    if (q) {
      this.scanResultId.set(q);
      this.load();
    }
  }

  setId(event: Event): void {
    this.scanResultId.set(Number((event.target as HTMLInputElement).value));
  }

  load(): void {
    const id = this.scanResultId();
    if (!id) return;
    this.loading.set(true);
    this.ai.getSuggestions(id).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.success) {
          this.summary.set(r.data.summary);
          this.cards.set(this.ai.toCards(r.data));
        }
      },
      error: () => this.loading.set(false)
    });
  }
}
