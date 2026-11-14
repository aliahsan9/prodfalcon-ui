import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PlatformService, SecurityPolicy } from '../../core/services/platform.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Quality gate"
      subtitle="Choose what makes a scan fail in GitHub Actions and on pull requests. Scores stay optional until you set a minimum." />

    @if (policy(); as gate) {
      <div class="row g-3">
        <div class="col-lg-7">
          <section class="pf-card">
            <div class="form-check form-switch mb-3">
              <input id="enabled" class="form-check-input" type="checkbox" [(ngModel)]="gate.enabled" [disabled]="!canEdit()" />
              <label class="form-check-label" for="enabled">Fail scans that miss this gate</label>
            </div>

            <div class="form-check mb-2">
              <input id="critical" class="form-check-input" type="checkbox" [(ngModel)]="gate.failOnCritical" [disabled]="!canEdit() || !gate.enabled" />
              <label class="form-check-label" for="critical">Fail on new critical findings</label>
            </div>
            <div class="form-check mb-2">
              <input id="high" class="form-check-input" type="checkbox" [(ngModel)]="gate.failOnHigh" [disabled]="!canEdit() || !gate.enabled" />
              <label class="form-check-label" for="high">Fail on new high findings</label>
            </div>
            <div class="form-check mb-3">
              <input id="secrets" class="form-check-input" type="checkbox" [(ngModel)]="gate.failOnNewSecrets" [disabled]="!canEdit() || !gate.enabled" />
              <label class="form-check-label" for="secrets">Fail on new secrets, passwords, API keys, or JWTs</label>
            </div>
            <div class="form-check mb-3">
              <input id="regression" class="form-check-input" type="checkbox" [(ngModel)]="gate.preventScoreRegression" [disabled]="!canEdit() || !gate.enabled" />
              <label class="form-check-label" for="regression">Fail when the overall score drops</label>
            </div>

            <div class="row g-3">
              <div class="col-sm-6">
                <label class="form-label" for="max-critical">Maximum open critical findings</label>
                <input id="max-critical" class="form-control" type="number" min="0" [(ngModel)]="gate.maxOpenCritical" [disabled]="!canEdit() || !gate.enabled" />
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="max-high">Maximum open high findings</label>
                <input id="max-high" class="form-control" type="number" min="0" [(ngModel)]="gate.maxOpenHigh" [disabled]="!canEdit() || !gate.enabled" />
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="min-overall">Minimum overall score</label>
                <input id="min-overall" class="form-control" type="number" min="0" max="100" [(ngModel)]="gate.minOverallScore" [disabled]="!canEdit() || !gate.enabled" />
                <p class="form-text">Use 0 to leave this check off.</p>
              </div>
              <div class="col-sm-6">
                <label class="form-label" for="min-security">Minimum security score</label>
                <input id="min-security" class="form-control" type="number" min="0" max="100" [(ngModel)]="gate.minSecurityScore" [disabled]="!canEdit() || !gate.enabled" />
                <p class="form-text">Use 0 to leave this check off.</p>
              </div>
            </div>

            @if (canEdit()) {
              <button class="btn btn-primary mt-2" type="button" (click)="save()" [disabled]="busy()">Save gate</button>
            } @else {
              <p class="small text-muted mt-3 mb-0">You can read the gate. An admin or owner can change it.</p>
            }
          </section>
        </div>
        <div class="col-lg-5">
          <section class="pf-card h-100">
            <h2 class="h6">What this gate does</h2>
            <ul>
              @for (rule of gate.rules; track rule) {
                <li>{{ rule }}</li>
              }
            </ul>
            <p class="small text-muted mb-2">GitHub Actions and pull request scans use this gate together with any rules on the registered repository.</p>
            <a routerLink="/integrations">Set up GitHub Actions</a>
          </section>
        </div>
      </div>
    }
  `
})
export class PoliciesComponent implements OnInit {
  private readonly platform = inject(PlatformService);
  private readonly toast = inject(ToastService);

  readonly policy = signal<SecurityPolicy | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    this.platform.policy().subscribe({
      next: (response) => this.policy.set(response.data ? { ...response.data } : null)
    });
  }

  canEdit(): boolean {
    return this.platform.canAdminister();
  }

  save(): void {
    const policy = this.policy();
    if (!policy) return;
    this.busy.set(true);
    this.platform.savePolicy(policy).subscribe({
      next: (response) => {
        this.policy.set(response.data);
        this.busy.set(false);
        this.toast.success('Quality gate saved.');
      },
      error: (error) => {
        this.busy.set(false);
        const body = (error as { error?: { message?: string } })?.error;
        this.toast.error(body?.message || 'The quality gate could not be saved.');
      }
    });
  }
}
