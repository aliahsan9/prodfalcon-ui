import { ChangeDetectionStrategy, Component } from '@angular/core';
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
    <div class="app-shell d-flex">
      <app-sidebar />
      <div class="app-main flex-grow-1 d-flex flex-column min-vh-100">
        <app-navbar />
        <main class="app-content flex-grow-1 p-3 p-lg-4">
          <router-outlet />
        </main>
        <app-footer />
      </div>
    </div>
  `,
  styles: [`
    .app-shell { min-height: 100vh; }
    .app-main { margin-left: 260px; }
    @media (max-width: 991px) {
      .app-main { margin-left: 0; }
    }
  `]
})
export class MainLayoutComponent {}

