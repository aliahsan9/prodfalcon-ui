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
    <header class="navbar px-3 py-2 d-flex align-items-center justify-content-between pf-card-glass">
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm d-lg-none" (click)="menuToggle.emit()" aria-label="Toggle menu">
          <i class="bi bi-list"></i>
        </button>
        <a routerLink="/upload" class="btn btn-primary btn-sm">
          <i class="bi bi-cloud-upload me-1"></i> <span class="d-none d-sm-inline">Upload ZIP</span>
        </a>
        <span class="badge rounded-pill text-bg-secondary">{{ tier }} Plan</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm theme-toggle"
          (click)="toggleTheme()"
          [attr.aria-label]="'Switch to ' + (theme.mode() === 'dark' ? 'light' : 'dark') + ' mode'">
          <i class="bi" [class.bi-moon-stars-fill]="theme.mode() === 'dark'" [class.bi-sun-fill]="theme.mode() === 'light'"></i>
          <span class="d-none d-md-inline ms-1">{{ theme.mode() === 'dark' ? 'Dark' : 'Light' }}</span>
        </button>
        <span class="text-muted small d-none d-md-inline">{{ auth.userEmail() }}</span>
        <button type="button" class="btn btn-outline-danger btn-sm" (click)="logout()">Logout</button>
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
    }
    .theme-toggle { min-width: 2.5rem; }
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
