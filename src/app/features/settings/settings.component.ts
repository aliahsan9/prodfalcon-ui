import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoggerService } from '../../core/services/logger.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Settings"
      subtitle="Profile, appearance, notifications, and AI preferences" />

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="pf-card h-100">
          <h2 class="h6 mb-3">Profile</h2>
          <p class="small text-muted mb-2">Signed in as</p>
          <p class="fw-semibold mb-0">{{ auth.userEmail() }}</p>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="pf-card h-100">
          <h2 class="h6 mb-3">Appearance</h2>
          <p class="small text-muted mb-3">Global dark and light themes across ProdFalcon</p>
          <div class="theme-switch d-flex gap-2">
            <button
              type="button"
              class="btn flex-fill"
              [class.btn-primary]="theme.mode() === 'dark'"
              [class.btn-outline-secondary]="theme.mode() !== 'dark'"
              (click)="setTheme('dark')">
              <i class="bi bi-moon-stars-fill me-1"></i> Dark
            </button>
            <button
              type="button"
              class="btn flex-fill"
              [class.btn-primary]="theme.mode() === 'light'"
              [class.btn-outline-secondary]="theme.mode() !== 'light'"
              (click)="setTheme('light')">
              <i class="bi bi-sun-fill me-1"></i> Light
            </button>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="pf-card h-100">
          <h2 class="h6 mb-3">AI model</h2>
          <select class="form-select" [(ngModel)]="aiModel" (ngModelChange)="savePrefs()">
            <option value="gpt-4o-mini">GPT-4o mini (default)</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="heuristic">Heuristic fallback</option>
          </select>
          <p class="small text-muted mt-2 mb-0">Used for AI suggestions when your OpenAI key is configured.</p>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="pf-card h-100">
          <h2 class="h6 mb-3">Timezone & language</h2>
          <div class="mb-2">
            <label class="form-label small">Timezone</label>
            <select class="form-select" [(ngModel)]="timezone" (ngModelChange)="savePrefs()">
              <option>UTC</option>
              <option>Asia/Karachi</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
            </select>
          </div>
          <div>
            <label class="form-label small">Language</label>
            <select class="form-select" [(ngModel)]="language" (ngModelChange)="savePrefs()">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="pf-card">
          <h2 class="h6 mb-3">Notifications</h2>
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="n1" [(ngModel)]="notifyCritical" (ngModelChange)="savePrefs()" />
            <label class="form-check-label" for="n1">Email on critical findings</label>
          </div>
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="n2" [(ngModel)]="notifyDigest" (ngModelChange)="savePrefs()" />
            <label class="form-check-label" for="n2">Weekly engineering digest</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="n3" [(ngModel)]="notifySlack" (ngModelChange)="savePrefs()" />
            <label class="form-check-label" for="n3">Slack / Teams webhook alerts (coming in Phase 2)</label>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="pf-card">
          <h2 class="h6 mb-2">API keys</h2>
          <input class="form-control mb-2" placeholder="ProdFalcon API key (generate in Enterprise)" disabled />
          <p class="small text-muted mb-0">API access and organization keys ship with the Enterprise plan.</p>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  private readonly prefsKey = 'prodfalcon-settings';

  aiModel = 'gpt-4o-mini';
  timezone = 'UTC';
  language = 'en';
  notifyCritical = true;
  notifyDigest = false;
  notifySlack = false;

  constructor() {
    this.loadPrefs();
    this.logger.info('Settings page opened');
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
    this.toast.success(`Theme set to ${mode}`);
  }

  savePrefs(): void {
    const prefs = {
      aiModel: this.aiModel,
      timezone: this.timezone,
      language: this.language,
      notifyCritical: this.notifyCritical,
      notifyDigest: this.notifyDigest,
      notifySlack: this.notifySlack
    };
    localStorage.setItem(this.prefsKey, JSON.stringify(prefs));
    this.logger.info('Settings saved', prefs);
    this.toast.success('Preferences saved');
  }

  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(this.prefsKey);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      this.aiModel = prefs.aiModel ?? this.aiModel;
      this.timezone = prefs.timezone ?? this.timezone;
      this.language = prefs.language ?? this.language;
      this.notifyCritical = prefs.notifyCritical ?? true;
      this.notifyDigest = prefs.notifyDigest ?? false;
      this.notifySlack = prefs.notifySlack ?? false;
    } catch {
      this.logger.warn('Failed to parse settings preferences');
    }
  }
}
