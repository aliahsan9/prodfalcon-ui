import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiService } from '../../core/services/ai.service';
import { BillingService } from '../../core/services/billing.service';
import { AiSuggestionCard, RemediationProposal } from '../../core/models/ai.model';
import { UpgradeBannerComponent } from '../../shared/components/upgrade-banner/upgrade-banner.component';
import { LockedFeatureComponent } from '../../shared/components/locked-feature/locked-feature.component';

@Component({
  selector: 'app-ai-suggestions',
  standalone: true,
  imports: [UpgradeBannerComponent, LockedFeatureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1 pf-page-title">Remediation</h1>
    <p class="text-muted mb-3 mb-md-4">Explanations and reviewable patches grounded in stored findings. Approval records a decision and does not modify the repository.</p>

    @if (!billing.isProFeature()) {
      <app-upgrade-banner class="mb-4 d-block" />
    }

    <app-locked-feature [locked]="!billing.isProFeature()">
      <div class="pf-card mb-3">
        <label class="form-label">Scan result ID</label>
        <div class="d-flex flex-column flex-sm-row gap-2">
          <input type="number" class="form-control" [value]="scanResultId()" (change)="setId($event)" />
          <button class="btn btn-primary flex-shrink-0" (click)="load()" [disabled]="loading()">Suggestions</button>
          <button class="btn btn-outline-primary flex-shrink-0" (click)="buildPatches()" [disabled]="loading()">Build patches</button>
        </div>
      </div>

      @if (planSummary()) {
        <div class="pf-card mb-3">
          <p class="mb-0">{{ planSummary() }}</p>
        </div>
      }

      @for (proposal of proposals(); track proposal.id) {
        <article class="pf-card mb-3">
          <div class="d-flex justify-content-between gap-2 flex-wrap mb-2">
            <strong>{{ proposal.title }}</strong>
            <span class="badge text-bg-secondary">{{ proposal.status }}</span>
          </div>
          <p class="small text-muted mb-2">{{ proposal.severity }} · {{ proposal.filePath }}:{{ proposal.lineNumber }}{{ proposal.columnNumber ? ':' + proposal.columnNumber : '' }}</p>
          <p>{{ proposal.explanation }}</p>
          <p class="small"><strong>Secure change.</strong> {{ proposal.secureSuggestion }}</p>
          <div class="row g-2">
            <div class="col-12 col-md-6">
              <div class="small text-muted mb-1">Cited line</div>
              <pre class="code-snippet">{{ proposal.originalSnippet }}</pre>
            </div>
            <div class="col-12 col-md-6">
              <div class="small text-muted mb-1">Suggested patch</div>
              <pre class="code-snippet code-after">{{ proposal.patchedSnippet }}</pre>
            </div>
          </div>
          <pre class="code-snippet mt-2">{{ proposal.diffText }}</pre>
          <p class="small text-muted mt-2 mb-2">{{ proposal.grounding }}</p>
          @if (proposal.status === 'Proposed') {
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success" type="button" (click)="decide(proposal, 'Approved')">Approve</button>
              <button class="btn btn-sm btn-outline-secondary" type="button" (click)="decide(proposal, 'Rejected')">Reject</button>
            </div>
          }
        </article>
      }

      @if (summary()) {
        <div class="pf-card mb-3 border-primary">
          <p class="mb-0 fw-semibold pf-break-word">{{ summary() }}</p>
        </div>
      }

      <div class="row g-3">
        @for (card of cards(); track card.title + card.description) {
          <div class="col-12 col-lg-6">
            <div class="pf-card h-100">
              <div class="d-flex justify-content-between mb-2 gap-2 flex-wrap">
                <span class="badge text-bg-primary">{{ card.category }}</span>
                <span class="small text-danger">{{ card.severityImpact }} impact</span>
              </div>
              <h2 class="h6">{{ card.title }}</h2>
              <p class="small text-muted">{{ card.description }}</p>
              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <div class="small text-muted mb-1">Before</div>
                  <pre class="code-snippet">{{ card.beforeCode }}</pre>
                </div>
                <div class="col-12 col-md-6">
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
      background: #0f172a;
      border-radius: 8px;
      padding: .75rem;
      font-size: .75rem;
      color: #fca5a5;
      margin: 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      white-space: pre;
      max-width: 100%;
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
  readonly proposals = signal<RemediationProposal[]>([]);
  readonly planSummary = signal('');

  ngOnInit(): void {
    this.billing.loadSubscription().subscribe();
    const q = Number(this.route.snapshot.queryParamMap.get('scanResultId'));
    if (q) {
      this.scanResultId.set(q);
      this.load();
      this.buildPatches();
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

  buildPatches(): void {
    const id = this.scanResultId();
    if (!id) return;
    this.loading.set(true);
    this.ai.buildRemediation(id).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.planSummary.set(response.data.summary);
          this.proposals.set(response.data.proposals ?? []);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  decide(proposal: RemediationProposal, decision: 'Approved' | 'Rejected'): void {
    this.ai.decideRemediation(proposal.id, decision).subscribe({
      next: (response) => {
        if (!response.success) return;
        this.proposals.update((items) => items.map((item) => item.id === proposal.id ? response.data : item));
      }
    });
  }
}
