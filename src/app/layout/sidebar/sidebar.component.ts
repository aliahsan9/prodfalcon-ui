import { ChangeDetectionStrategy, Component } from '@angular/core';
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
      <div class="brand px-3 py-4">
        <span class="brand-icon"><i class="bi bi-shield-shaded"></i></span>
        <span class="brand-text pf-gradient-text fw-bold">ProdFalcon</span>
      </div>
      <nav class="nav flex-column px-2 gap-1">
        @for (item of nav; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-link">
            <i class="bi {{ item.icon }} me-2"></i>{{ item.label }}
            @if (item.pro) { <span class="badge bg-primary ms-auto">Pro</span> }
          </a>
        }
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px; position: fixed; inset: 0 auto 0 0; z-index: 100;
      background: var(--pf-bg-elevated); border-right: 1px solid var(--pf-border);
      display: flex; flex-direction: column;
    }
    .brand { display: flex; align-items: center; gap: .6rem; }
    .brand-icon { font-size: 1.5rem; color: #8b5cf6; }
    .nav-link {
      color: var(--pf-text-muted); border-radius: 12px; padding: .65rem .85rem;
      display: flex; align-items: center;
    }
    .nav-link:hover, .nav-link.active {
      background: rgba(99, 102, 241, 0.15); color: var(--pf-text);
    }
    @media (max-width: 991px) {
      .sidebar { transform: translateX(-100%); }
    }
  `]
})
export class SidebarComponent {
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

