import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1">Settings</h1>
    <p class="text-muted mb-4">Profile, API keys, and preferences</p>

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="pf-card">
          <h2 class="h6">Profile</h2>
          <p class="small text-muted mb-0">Signed in as <strong>{{ auth.userEmail() }}</strong></p>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="pf-card">
          <h2 class="h6">Theme</h2>
          <button class="btn btn-outline-secondary btn-sm" (click)="theme.toggle()">
            Switch to {{ theme.mode() === 'dark' ? 'light' : 'dark' }} mode
          </button>
        </div>
      </div>
      <div class="col-12">
        <div class="pf-card">
          <h2 class="h6">API keys</h2>
          <input class="form-control mb-2" placeholder="ProdFalcon API key (generate in Enterprise)" disabled />
          <p class="small text-muted mb-0">API access available on Enterprise plan.</p>
        </div>
      </div>
      <div class="col-12">
        <div class="pf-card">
          <h2 class="h6">Notifications</h2>
          <div class="form-check"><input class="form-check-input" type="checkbox" checked id="n1" /><label class="form-check-label" for="n1">Email on critical findings</label></div>
          <div class="form-check"><input class="form-check-input" type="checkbox" id="n2" /><label class="form-check-label" for="n2">Weekly digest</label></div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
}
