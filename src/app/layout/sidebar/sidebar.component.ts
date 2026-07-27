import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  pro?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar">
      <div class="brand px-3 py-3 py-lg-4">
        <span class="brand-icon"><i class="bi bi-shield-shaded"></i></span>
        <div class="min-w-0">
          <div class="brand-text pf-gradient-text fw-bold">ProdFalcon</div>
          <div class="small text-muted">AI Quality Platform</div>
        </div>
      </div>
      <nav class="nav flex-column px-2 gap-1 flex-grow-1 sidebar-nav">
        @for (item of nav; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-link"
            (click)="navigate.emit()">
            <i class="bi {{ item.icon }} me-2 flex-shrink-0"></i>
            <span class="text-truncate">{{ item.label }}</span>
            @if (item.pro) { <span class="badge bg-primary ms-auto flex-shrink-0">Pro</span> }
          </a>
        }
      </nav>
      <div class="px-3 py-3 small text-muted border-top sidebar-foot" style="border-color: var(--pf-border) !important;">
        Phase 1 · Engineering Health
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      max-width: 85vw;
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 100;
      background: var(--pf-bg-elevated);
      border-right: 1px solid var(--pf-border);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, background 0.28s ease;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .brand { display: flex; align-items: center; gap: .75rem; flex-shrink: 0; }
    .brand-icon { font-size: 1.6rem; color: var(--pf-violet); line-height: 1; }
    .sidebar-nav { overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .nav-link {
      color: var(--pf-text-muted);
      border-radius: 12px;
      padding: .7rem .85rem;
      display: flex;
      align-items: center;
      min-height: 44px;
      transition: background 0.18s ease, color 0.18s ease;
    }
    .nav-link:hover, .nav-link.active {
      background: rgba(99, 102, 241, 0.15);
      color: var(--pf-text);
    }
    .sidebar-foot { flex-shrink: 0; }
    @media (max-width: 991px) {
      .sidebar { transform: translateX(-100%); }
    }
  `]
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'bi-grid-1x2-fill', route: '/dashboard' },
    { label: 'Projects', icon: 'bi-folder2-open', route: '/projects' },
    { label: 'Upload', icon: 'bi-cloud-upload', route: '/upload' },
    { label: 'AI Suggestions', icon: 'bi-robot', route: '/ai-suggestions', pro: true },
    { label: 'CI/CD', icon: 'bi-git', route: '/ci-cd', pro: true },
    { label: 'Reports', icon: 'bi-file-earmark-bar-graph', route: '/reports' },
    { label: 'Billing', icon: 'bi-credit-card', route: '/billing' },
    { label: 'Settings', icon: 'bi-gear', route: '/settings' }
  ];
}
