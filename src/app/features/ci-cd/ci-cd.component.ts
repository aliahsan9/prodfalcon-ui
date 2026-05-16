import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BillingService } from '../../core/services/billing.service';
import { UpgradeBannerComponent } from '../../shared/components/upgrade-banner/upgrade-banner.component';

@Component({
  selector: 'app-ci-cd',
  standalone: true,
  imports: [UpgradeBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1">CI/CD integrations</h1>
    <p class="text-muted mb-4">Connect repositories and scan every pull request</p>

    @if (!billing.isProFeature()) {
      <app-upgrade-banner title="CI/CD requires Pro" message="Connect GitHub and block merges on critical findings." class="mb-4 d-block" />
    }

    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="pf-card h-100">
          <h2 class="h6"><i class="bi bi-github me-2"></i>GitHub</h2>
          <span class="badge text-bg-warning mb-2">Not connected</span>
          <p class="small text-muted">Scan PRs and comment on issues automatically.</p>
          <button class="btn btn-sm btn-outline-light">Connect GitHub</button>
        </div>
      </div>
      <div class="col-md-4">
        <div class="pf-card h-100 opacity-75">
          <h2 class="h6"><i class="bi bi-gitlab me-2"></i>GitLab</h2>
          <span class="badge text-bg-secondary mb-2">Coming soon</span>
        </div>
      </div>
      <div class="col-md-4">
        <div class="pf-card h-100 opacity-75">
          <h2 class="h6"><i class="bi bi-microsoft me-2"></i>Azure DevOps</h2>
          <span class="badge text-bg-secondary mb-2">Coming soon</span>
        </div>
      </div>
    </div>

    <div class="pf-card">
      <h2 class="h6 mb-3">PR scan history</h2>
      <table class="table table-dark table-hover mb-0">
        <thead><tr><th>Repository</th><th>PR</th><th>Score</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td colspan="4" class="text-muted text-center py-4">Connect GitHub to see PR scan results</td></tr>
        </tbody>
      </table>
    </div>
  `
})
export class CiCdComponent {
  readonly billing = inject(BillingService);
}
