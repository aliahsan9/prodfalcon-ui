import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ShellService } from '../../core/services/shell.service';
import { ThemeService } from '../../core/services/theme.service';
import { ProjectSummary } from '../../core/models/scan.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="d-flex align-items-center gap-2 min-w-0">
        <button type="button" class="icon-btn d-lg-none" (click)="menuToggle.emit()" aria-label="Open navigation">
          <i class="bi bi-list"></i>
        </button>
        <button type="button" class="icon-btn d-none d-lg-inline-flex" (click)="shell.toggleCollapsed()" aria-label="Collapse navigation">
          <i class="bi bi-layout-sidebar"></i>
        </button>
        <div class="workspace text-truncate">{{ auth.organization() || 'Workspace' }}</div>
      </div>

      <form class="search d-none d-md-flex" (submit)="search(); $event.preventDefault()">
        <i class="bi bi-search"></i>
        <input [formControl]="query" type="search" placeholder="Search findings" aria-label="Search findings" />
      </form>

      <div class="d-flex align-items-center gap-1">
        <a routerLink="/settings" class="icon-btn" title="Help and scoring" aria-label="Help">
          <i class="bi bi-question-circle"></i>
        </a>
        <div class="notify">
          <button type="button" class="icon-btn" (click)="toggleNotes()" aria-label="Notifications">
            <i class="bi bi-bell"></i>
            @if (attention()) { <span class="dot">{{ attention() }}</span> }
          </button>
          @if (notesOpen()) {
            <div class="menu">
              @for (item of notes(); track item.projectId) {
                <a [routerLink]="['/scans', item.latestScanResultId]" (click)="notesOpen.set(false)">
                  <strong>{{ item.displayName || item.fileName }}</strong>
                  <span>{{ item.latestStatus || item.status }} · {{ item.issueCount }} findings</span>
                </a>
              } @empty {
                <p>No recent scan activity.</p>
              }
            </div>
          }
        </div>
        <button type="button" class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="'Switch theme'">
          <i class="bi" [class.bi-moon]="theme.mode() === 'dark'" [class.bi-sun]="theme.mode() === 'light'"></i>
        </button>
        <div class="notify">
          <button type="button" class="profile" (click)="profileOpen.set(!profileOpen())">
            {{ auth.userEmail() || 'Account' }}
          </button>
          @if (profileOpen()) {
            <div class="menu">
              <p>{{ auth.role() || 'Member' }} · {{ auth.plan() }}</p>
              <a routerLink="/settings" (click)="profileOpen.set(false)">Settings</a>
              <button type="button" (click)="auth.logout()">Sign out</button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
      padding: 0.5rem 1rem; position: sticky; top: 0; z-index: 40;
      background: var(--pf-bg-elevated); border-bottom: 1px solid var(--pf-border);
    }
    .workspace { font-weight: 600; }
    .search {
      flex: 1; max-width: 420px; align-items: center; gap: 0.5rem;
      border: 1px solid var(--pf-border); border-radius: 8px; padding: 0.35rem 0.7rem; background: var(--pf-input-bg);
    }
    .search input { border: 0; outline: 0; width: 100%; background: transparent; color: inherit; }
    .icon-btn, .profile {
      border: 1px solid var(--pf-border); background: transparent; color: inherit; border-radius: 8px;
      min-width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; position: relative;
    }
    .profile { padding: 0 0.7rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .notify { position: relative; }
    .dot {
      position: absolute; top: -4px; right: -4px; background: #dc2626; color: white; border-radius: 99px;
      font-size: 0.65rem; min-width: 16px; height: 16px; display: grid; place-items: center;
    }
    .menu {
      position: absolute; right: 0; top: 42px; width: 280px; background: var(--pf-card);
      border: 1px solid var(--pf-border); border-radius: 10px; padding: 0.4rem; box-shadow: var(--pf-shadow);
    }
    .menu a, .menu button, .menu p {
      display: flex; flex-direction: column; width: 100%; text-align: left; background: transparent; border: 0;
      color: inherit; padding: 0.45rem 0.55rem; border-radius: 6px; text-decoration: none;
    }
    .menu a:hover, .menu button:hover { background: var(--pf-card-hover); }
    .menu span, .menu p { color: var(--pf-text-muted); font-size: 0.78rem; }
  `]
})
export class NavbarComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly shell = inject(ShellService);
  private readonly projects = inject(ProjectService);
  private readonly router = inject(Router);

  readonly query = new FormControl('', { nonNullable: true });
  readonly notesOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly notes = signal<ProjectSummary[]>([]);
  readonly attention = signal(0);

  ngOnInit(): void {
    this.projects.getProjects().subscribe({
      next: (response) => {
        if (!response.success) return;
        const items = response.data ?? [];
        this.notes.set(items.slice(0, 6));
        this.attention.set(items.filter((item) => ['Queued', 'Scanning', 'Failed'].includes(item.latestStatus || item.status)).length);
      },
      error: () => this.notes.set([])
    });
  }

  search(): void {
    const term = this.query.value.trim();
    this.router.navigate(['/vulnerabilities'], { queryParams: term ? { q: term } : {} });
  }

  toggleNotes(): void {
    this.notesOpen.update((open) => !open);
    this.profileOpen.set(false);
  }
}
