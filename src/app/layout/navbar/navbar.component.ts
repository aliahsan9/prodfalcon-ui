import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { BillingService } from '../../core/services/billing.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="navbar px-2 px-sm-3 py-2 d-flex align-items-center justify-content-between gap-2 pf-card-glass">
      <div class="d-flex align-items-center gap-1 gap-sm-2 min-w-0">
        <button type="button" class="btn btn-outline-secondary btn-sm nav-icon-btn d-lg-none" (click)="menuToggle.emit()" aria-label="Toggle menu">
          <i class="bi bi-list"></i>
        </button>
        <a routerLink="/upload" class="btn btn-primary btn-sm">
          <i class="bi bi-cloud-upload"></i>
          <span class="d-none d-sm-inline ms-1">Upload ZIP</span>
        </a>
        <span class="badge rounded-pill text-bg-secondary d-none d-sm-inline-flex">{{ tier }} Plan</span>
      </div>
      <div class="d-flex align-items-center gap-1 gap-sm-2 flex-shrink-0">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm nav-icon-btn"
          (click)="toggleTheme()"
          [attr.aria-label]="'Switch to ' + (theme.mode() === 'dark' ? 'light' : 'dark') + ' mode'">
          <i class="bi" [class.bi-moon-stars-fill]="theme.mode() === 'dark'" [class.bi-sun-fill]="theme.mode() === 'light'"></i>
          <span class="d-none d-lg-inline ms-1">{{ theme.mode() === 'dark' ? 'Dark' : 'Light' }}</span>
        </button>
        <span class="text-muted small d-none d-xl-inline text-truncate" style="max-width: 160px;">{{ auth.userEmail() }}</span>
        <button type="button" class="btn btn-outline-danger btn-sm" (click)="logout()" aria-label="Logout">
          <i class="bi bi-box-arrow-right"></i>
          <span class="d-none d-md-inline ms-1">Logout</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      border-bottom: 1px solid var(--pf-border);
      position: sticky;
      top: 0;
      z-index: 50;
      border-radius: 0;
      min-height: 52px;
      padding-top: max(0.5rem, env(safe-area-inset-top));
    }
    .nav-icon-btn {
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    @media (min-width: 992px) {
      .nav-icon-btn {
        width: auto;
        height: auto;
        padding: 0.25rem 0.5rem;
      }
    }
  `]
})
export class NavbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  get tier(): string {
    return this.billing.subscription()?.tier ?? 'Free';
  }

  toggleTheme(): void {
    this.theme.toggle();
    this.toast.show(`Switched to ${this.theme.mode()} mode`, 'info');
  }

  logout(): void {
    this.auth.logout();
    this.toast.success('Signed out');
  }
}
