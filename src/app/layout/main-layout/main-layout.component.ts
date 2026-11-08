import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ShellService } from '../../core/services/shell.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell d-flex" [class.pf-mobile-sidebar-open]="sidebarOpen()" [class.collapsed]="shell.collapsed()">
      @if (sidebarOpen()) {
        <div class="sidebar-backdrop d-lg-none" (click)="sidebarOpen.set(false)"></div>
      }
      <app-sidebar (navigate)="sidebarOpen.set(false)" />
      <div class="app-main flex-grow-1 d-flex flex-column min-vh-100">
        <app-navbar (menuToggle)="toggleSidebar()" />
        <main class="app-content flex-grow-1">
          <router-outlet />
        </main>
        <app-footer />
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      min-height: 100dvh;
      width: 100%;
      overflow-x: clip;
    }
    .app-main {
      margin-left: var(--pf-sidebar-width);
      transition: margin-left 0.2s ease, width 0.2s ease;
      min-width: 0;
      width: calc(100% - var(--pf-sidebar-width));
    }
    .collapsed .app-main {
      margin-left: var(--pf-sidebar-collapsed);
      width: calc(100% - var(--pf-sidebar-collapsed));
    }
    .app-content {
      min-width: 0;
      max-width: 100%;
      padding: 0.25rem 1.15rem 1.25rem;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: var(--pf-overlay);
      z-index: 90;
      -webkit-tap-highlight-color: transparent;
    }
    @media (max-width: 991px) {
      .app-main, .collapsed .app-main { margin-left: 0; width: 100%; }
    }
    @media (max-width: 575px) {
      .app-content { padding: 0.15rem 0.75rem 1rem; }
    }
  `]
})
export class MainLayoutComponent implements OnDestroy {
  readonly sidebarOpen = signal(false);
  readonly shell = inject(ShellService);

  constructor() {
    effect(() => {
      const open = this.sidebarOpen();
      document.body.classList.toggle('pf-sidebar-open', open);
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pf-sidebar-open');
  }
}
