import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { BillingService } from '../../core/services/billing.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="navbar px-3 py-2 d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-2">
        <a routerLink="/upload" class="btn btn-primary btn-sm">
          <i class="bi bi-cloud-upload me-1"></i> Upload ZIP
        </a>
        <span class="badge rounded-pill text-bg-secondary">{{ tier }} Plan</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary btn-sm" (click)="theme.toggle()">
          <i class="bi" [class.bi-moon-fill]="theme.mode() === 'dark'" [class.bi-sun-fill]="theme.mode() === 'light'"></i>
        </button>
        <span class="text-muted small d-none d-md-inline">{{ auth.userEmail() }}</span>
        <button class="btn btn-outline-danger btn-sm" (click)="auth.logout()">Logout</button>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      border-bottom: 1px solid var(--pf-border);
      background: rgba(17, 24, 39, 0.6);
      backdrop-filter: blur(8px);
    }
  `]
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly billing = inject(BillingService);

  get tier(): string {
    return this.billing.subscription()?.tier ?? 'Free';
  }
}

