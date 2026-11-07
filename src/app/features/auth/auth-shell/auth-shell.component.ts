import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicFooterComponent } from '../../../layout/public-footer/public-footer.component';
import { PublicNavbarComponent } from '../../../layout/public-navbar/public-navbar.component';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterOutlet, PublicNavbarComponent, PublicFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-shell">
      <app-public-navbar />
      <main>
        <router-outlet />
      </main>
      <app-public-footer />
    </div>
  `,
  styleUrl: './auth-shell.component.scss'
})
export class AuthShellComponent {}
