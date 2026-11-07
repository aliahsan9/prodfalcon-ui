import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ShellService } from '../../core/services/shell.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="shell.collapsed()">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">PF</span>
        @if (!shell.collapsed()) {
          <div class="min-w-0">
            <div class="brand-text">ProdFalcon</div>
            <div class="brand-sub text-truncate">{{ auth.organization() || 'Workspace' }}</div>
          </div>
        }
      </div>

      <nav class="nav flex-column sidebar-nav">
        @for (item of nav; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="nav-link"
            [attr.title]="shell.collapsed() ? item.label : null"
            (click)="navigate.emit()">
            <i class="bi {{ item.icon }}"></i>
            @if (!shell.collapsed()) { <span>{{ item.label }}</span> }
          </a>
        }
      </nav>

      <div class="sidebar-user">
        <div class="avatar">{{ initials }}</div>
        @if (!shell.collapsed()) {
          <div class="min-w-0">
            <div class="user-email text-truncate">{{ auth.userEmail() || 'Signed in' }}</div>
            <div class="user-role">{{ auth.role() || 'Member' }}</div>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 248px;
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 100;
      background: #0e1728;
      color: #e8eef7;
      border-right: 1px solid rgba(148, 163, 184, 0.16);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, transform 0.2s ease;
    }
    .sidebar.collapsed { width: 76px; }
    .brand, .sidebar-user { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; }
    .brand-mark, .avatar {
      width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center;
      background: #1d4ed8; color: white; font-weight: 700; flex-shrink: 0;
    }
    .avatar { background: #1e293b; font-size: 0.8rem; }
    .brand-text { font-weight: 700; letter-spacing: 0.01em; }
    .brand-sub, .user-role { color: #94a3b8; font-size: 0.75rem; }
    .user-email { font-size: 0.82rem; }
    .sidebar-nav { padding: 0.25rem 0.6rem; overflow: auto; flex: 1; }
    .nav-link {
      color: #cbd5e1; border-radius: 8px; min-height: 42px; display: flex; align-items: center;
      gap: 0.75rem; padding: 0.45rem 0.7rem; margin-bottom: 0.15rem;
    }
    .nav-link i { font-size: 1.05rem; width: 1.2rem; text-align: center; }
    .nav-link:hover, .nav-link.active { background: rgba(37, 99, 235, 0.22); color: white; }
    .sidebar.collapsed .nav-link, .sidebar.collapsed .brand, .sidebar.collapsed .sidebar-user { justify-content: center; }
    .sidebar-user { border-top: 1px solid rgba(148, 163, 184, 0.16); }
    @media (max-width: 991px) {
      .sidebar { transform: translateX(-105%); width: min(248px, 86vw); }
      .sidebar.collapsed { width: min(248px, 86vw); }
      :host-context(.pf-mobile-sidebar-open) .sidebar { transform: translateX(0); }
    }
  `]
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  readonly shell = inject(ShellService);
  readonly auth = inject(AuthService);

  readonly nav: NavItem[] = [
    { label: 'Overview', icon: 'bi-grid-1x2', route: '/dashboard' },
    { label: 'New Scan', icon: 'bi-shield-plus', route: '/scans/new' },
    { label: 'Projects', icon: 'bi-folder2', route: '/projects' },
    { label: 'Scan History', icon: 'bi-clock-history', route: '/history' },
    { label: 'Security Center', icon: 'bi-bug', route: '/vulnerabilities' },
    { label: 'Code Quality', icon: 'bi-tools', route: '/quality' },
    { label: 'Architecture', icon: 'bi-diagram-3', route: '/architecture' },
    { label: 'Threat Modeling', icon: 'bi-shield-exclamation', route: '/threats' },
    { label: 'Remediation', icon: 'bi-check2-square', route: '/remediation' },
    { label: 'Reports', icon: 'bi-file-earmark-text', route: '/reports' },
    { label: 'AI Copilot', icon: 'bi-chat-square-text', route: '/assistant' },
    { label: 'Integrations', icon: 'bi-git', route: '/integrations' },
    { label: 'Settings', icon: 'bi-gear', route: '/settings' }
  ];

  get initials(): string {
    const email = this.auth.userEmail();
    return (email.slice(0, 2) || 'PF').toUpperCase();
  }
}
