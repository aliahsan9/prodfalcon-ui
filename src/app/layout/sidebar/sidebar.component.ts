import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ShellService } from '../../core/services/shell.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="compact()">
      <a routerLink="/dashboard" class="brand" (click)="closeMenus()">
        <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <linearGradient id="pfLogo" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop stop-color="#7dd3fc"/>
              <stop offset="1" stop-color="#2563eb"/>
            </linearGradient>
          </defs>
          <path fill="url(#pfLogo)" d="M7 18c2.2-7 8.4-12 14.8-13.2-1.2 3.2-1 6.2.6 8.6 2.2-1.2 3.4-3.4 3.6-6.2C28.6 12.8 26 20 18.6 24.2 14.2 26.8 9.6 26.6 6 24.6 8.8 23.2 10.2 20.8 7 18Z"/>
          <path fill="#93c5fd" d="M8.2 20.4c2.6-1.2 4.8-1 7.6.2-2.4 1.5-4.8 1.6-7.6-.2Z" opacity=".9"/>
        </svg>
        @if (!compact()) { <span class="brand-text">ProdFalcon</span> }
      </a>

      <nav class="sidebar-nav" aria-label="Primary">
        @for (item of mainNav; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: !!item.exact }"
            class="nav-link"
            [attr.title]="compact() ? item.label : null"
            (click)="closeMenus()">
            <i class="bi {{ item.icon }}"></i>
            @if (!compact()) {
              <span>{{ item.label }}</span>
              @if (item.badge) { <span class="beta">{{ item.badge }}</span> }
            }
          </a>
        }

        @if (!compact()) { <div class="nav-label">More</div> }
        @for (item of moreNav; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-link"
            [attr.title]="compact() ? item.label : null"
            (click)="closeMenus()">
            <i class="bi {{ item.icon }}"></i>
            @if (!compact()) { <span>{{ item.label }}</span> }
          </a>
        }
      </nav>

      @if (!compact()) {
        <a routerLink="/billing" class="upgrade" (click)="closeMenus()">
          <span class="upgrade-icon" aria-hidden="true"><i class="bi bi-rocket-takeoff"></i></span>
          <strong>{{ isPaid() ? auth.plan() + ' plan' : 'Upgrade to Pro' }}</strong>
          <span class="upgrade-copy">
            {{ isPaid() ? 'Manage billing, usage, and workspace access.' : 'Unlock advanced features for deeper security.' }}
          </span>
          <span class="upgrade-btn">{{ isPaid() ? 'Manage plan' : 'View Plans' }} <i class="bi bi-arrow-right"></i></span>
        </a>
      } @else {
        <a routerLink="/billing" class="upgrade-mini" title="Plans" aria-label="Plans" (click)="closeMenus()">
          <i class="bi bi-rocket-takeoff"></i>
        </a>
      }

      <div class="sidebar-user">
        @if (userMenu()) {
          <div class="user-menu">
            <div class="hint">{{ auth.userEmail() }}</div>
            <div class="hint">{{ auth.organization() || 'Workspace' }} · {{ auth.role() || 'Member' }}</div>
            <a routerLink="/settings" (click)="closeMenus()">Settings</a>
            <button type="button" (click)="auth.logout()">Sign out</button>
          </div>
        }
        <button type="button" class="user-btn" (click)="toggleUser()" [attr.aria-expanded]="userMenu()">
          <span class="avatar">{{ initials }}</span>
          @if (!compact()) {
            <span class="min-w-0">
              <span class="user-name text-truncate">{{ auth.displayName() }}</span>
              <span class="user-plan text-truncate">{{ planLabel() }}</span>
            </span>
            <i class="bi bi-chevron-expand user-caret"></i>
          }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--pf-sidebar-width);
      height: 100vh;
      height: 100dvh;
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 100;
      background: var(--pf-sidebar);
      color: var(--pf-sidebar-text);
      border-right: 1px solid var(--pf-sidebar-border);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, transform 0.2s ease;
    }
    .sidebar.collapsed { width: var(--pf-sidebar-collapsed); }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 1.05rem 1rem 0.7rem;
      color: inherit;
      text-decoration: none;
    }
    .brand-mark { width: 32px; height: 32px; flex: none; }
    .brand-text { font-weight: 800; font-size: 1.12rem; letter-spacing: -0.03em; }
    .sidebar-nav { padding: 0.2rem 0.7rem 0.5rem; overflow: auto; flex: 1; scrollbar-width: thin; }
    .nav-label {
      margin: 0.85rem 0.7rem 0.3rem;
      color: var(--pf-sidebar-muted);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .nav-link {
      color: var(--pf-sidebar-muted);
      border-radius: 12px;
      min-height: 42px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.4rem 0.75rem;
      margin-bottom: 0.12rem;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
    }
    .nav-link i { font-size: 1.05rem; width: 1.25rem; text-align: center; }
    .nav-link:hover { background: var(--pf-nav-hover); color: var(--pf-sidebar-text); }
    .nav-link.active {
      background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 8px 18px rgba(37, 99, 235, 0.32);
    }
    .nav-link.active:hover { color: white; }
    .beta {
      margin-left: auto;
      font-size: 0.62rem;
      font-weight: 800;
      padding: 0.08rem 0.4rem;
      border-radius: 999px;
      color: var(--pf-beta);
      background: var(--pf-beta-bg);
      border: 1px solid rgba(147, 197, 253, 0.28);
    }
    .nav-link.active .beta { color: white; background: rgba(255, 255, 255, 0.18); border-color: transparent; }
    .upgrade {
      margin: 0.4rem 0.75rem 0.55rem;
      padding: 0.9rem 0.9rem 0.8rem;
      border-radius: 16px;
      text-decoration: none;
      color: white;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 58%, #1e40af 100%);
      box-shadow: 0 12px 28px rgba(29, 78, 216, 0.32);
    }
    .upgrade-icon {
      width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
      background: rgba(255, 255, 255, 0.16); margin-bottom: 0.25rem;
    }
    .upgrade strong { font-size: 0.95rem; }
    .upgrade-copy { color: rgba(255, 255, 255, 0.88); font-size: 0.75rem; line-height: 1.35; }
    .upgrade-btn {
      margin-top: 0.5rem; background: white; color: #1d4ed8; border-radius: 999px;
      text-align: center; font-weight: 800; font-size: 0.8rem; padding: 0.42rem 0.6rem;
    }
    .upgrade-mini {
      margin: 0.4rem auto 0.4rem; width: 42px; height: 42px; border-radius: 12px;
      display: grid; place-items: center; color: white; text-decoration: none;
      background: linear-gradient(180deg, #3b82f6, #1d4ed8);
    }
    .sidebar-user { border-top: 1px solid var(--pf-sidebar-border); padding: 0.7rem; position: relative; }
    .user-btn {
      width: 100%; display: flex; align-items: center; gap: 0.7rem; background: transparent;
      border: 0; color: inherit; text-align: left; border-radius: 12px; padding: 0.25rem;
    }
    .user-btn:hover { background: var(--pf-nav-hover); }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; flex: none;
      background: linear-gradient(135deg, #93c5fd, #2563eb); color: white; font-weight: 800; font-size: 0.75rem;
    }
    .user-name, .user-plan { display: block; }
    .user-name { font-weight: 800; font-size: 0.84rem; }
    .user-plan { color: var(--pf-sidebar-muted); font-size: 0.74rem; }
    .user-caret { margin-left: auto; color: var(--pf-sidebar-muted); }
    .user-menu {
      position: absolute; left: 0.7rem; right: 0.7rem; bottom: calc(100% - 0.15rem);
      background: var(--pf-card); color: var(--pf-text); border: 1px solid var(--pf-border);
      border-radius: 12px; padding: 0.35rem; box-shadow: var(--pf-shadow); z-index: 6;
    }
    .user-menu a, .user-menu button {
      display: block; width: 100%; text-align: left; background: transparent; border: 0;
      color: inherit; border-radius: 8px; padding: 0.45rem 0.55rem; font-size: 0.82rem; text-decoration: none;
    }
    .user-menu a:hover, .user-menu button:hover { background: var(--pf-card-hover); }
    .hint { color: var(--pf-text-muted); font-size: 0.72rem; padding: 0.3rem 0.55rem; overflow-wrap: anywhere; }
    .sidebar.collapsed .brand, .sidebar.collapsed .nav-link, .sidebar.collapsed .user-btn { justify-content: center; }
    .sidebar.collapsed .nav-link { padding-left: 0; padding-right: 0; }
    @media (max-width: 991px) {
      .sidebar { transform: translateX(-105%); width: min(280px, 88vw); box-shadow: var(--pf-shadow); }
      .sidebar.collapsed { width: min(280px, 88vw); }
      :host-context(.pf-mobile-sidebar-open) .sidebar { transform: translateX(0); }
    }
  `]
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  readonly shell = inject(ShellService);
  readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly userMenu = signal(false);
  readonly mobile = signal(typeof window !== 'undefined' && window.innerWidth < 992);

  readonly mainNav: NavItem[] = [
    { label: 'Dashboard', icon: 'bi-house-door-fill', route: '/dashboard', exact: true },
    { label: 'Scan Projects', icon: 'bi-folder2-open', route: '/projects' },
    { label: 'Scan History', icon: 'bi-clock-history', route: '/history' },
    { label: 'Reports', icon: 'bi-file-earmark-bar-graph', route: '/reports' },
    { label: 'Vulnerabilities', icon: 'bi-bug', route: '/vulnerabilities' },
    { label: 'AI Assistant', icon: 'bi-robot', route: '/assistant', badge: 'Beta' },
    { label: 'Integrations', icon: 'bi-github', route: '/integrations' },
    { label: 'Analytics', icon: 'bi-graph-up', route: '/analytics' },
    { label: 'Team', icon: 'bi-people', route: '/team' },
    { label: 'Policies', icon: 'bi-sliders', route: '/policies' }
  ];

  readonly moreNav: NavItem[] = [
    { label: 'New Scan', icon: 'bi-shield-plus', route: '/scans/new' },
    { label: 'Code Quality', icon: 'bi-tools', route: '/quality' },
    { label: 'Architecture', icon: 'bi-diagram-3', route: '/architecture' },
    { label: 'Threat Modeling', icon: 'bi-shield-exclamation', route: '/threats' },
    { label: 'Remediation', icon: 'bi-check2-square', route: '/ai-suggestions' },
    { label: 'Settings', icon: 'bi-gear', route: '/settings' }
  ];

  @HostListener('window:resize')
  syncViewport(): void {
    this.mobile.set(window.innerWidth < 992);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.userMenu.set(false);
    }
  }

  compact(): boolean {
    return this.shell.collapsed() && !this.mobile();
  }

  isPaid(): boolean {
    return (this.auth.plan() || 'Free').toLowerCase() !== 'free';
  }

  planLabel(): string {
    const plan = this.auth.plan() || 'Free';
    return `${plan} User`;
  }

  toggleUser(): void {
    this.userMenu.update((open) => !open);
  }

  closeMenus(): void {
    this.userMenu.set(false);
    this.navigate.emit();
  }

  get initials(): string {
    const parts = this.auth.displayName().split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (this.auth.displayName().slice(0, 2) || 'PF').toUpperCase();
  }
}
