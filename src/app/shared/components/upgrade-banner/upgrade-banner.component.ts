import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-upgrade-banner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="upgrade-banner pf-card d-flex align-items-center justify-content-between gap-3 flex-wrap">
      <div>
        <div class="fw-semibold"><i class="bi bi-stars me-2"></i>{{ title }}</div>
        <div class="text-muted small">{{ message }}</div>
      </div>
      <a routerLink="/billing" class="btn btn-primary btn-sm">Upgrade to Pro</a>
    </div>
  `,
  styles: [`
    .upgrade-banner {
      border: 1px dashed rgba(99, 102, 241, 0.5);
      background: linear-gradient(135deg, rgba(99,102,241,.12), rgba(6,182,212,.08));
    }
  `]
})
export class UpgradeBannerComponent {
  @Input() title = 'Unlock AI suggestions with Pro';
  @Input() message = 'Get AI-powered fixes, CI/CD integrations, and unlimited scans.';
}

