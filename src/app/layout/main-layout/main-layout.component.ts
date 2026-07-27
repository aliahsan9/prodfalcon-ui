import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell d-flex" [class.pf-mobile-sidebar-open]="sidebarOpen()">
      @if (sidebarOpen()) {
        <div class="sidebar-backdrop d-lg-none" (click)="sidebarOpen.set(false)"></div>
      }
      <app-sidebar (navigate)="sidebarOpen.set(false)" />
      <div class="app-main flex-grow-1 d-flex flex-column min-vh-100">
        <app-navbar (menuToggle)="toggleSidebar()" />
        <main class="app-content flex-grow-1 p-3 p-lg-4">
          <router-outlet />
        </main>
        <app-footer />
      </div>
    </div>
  `,
  styles: [`
    .app-shell { min-height: 100vh; }
    .app-main { margin-left: 260px; transition: margin-left 0.25s ease; }
    .sidebar-backdrop {
      position: fixed; inset: 0; background: var(--pf-overlay); z-index: 90;
    }
    @media (max-width: 991px) {
      .app-main { margin-left: 0; }
    }
  `]
})
export class MainLayoutComponent {
  readonly sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }
}
