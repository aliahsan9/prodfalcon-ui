import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
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
      <div class="d-flex align-items-center gap-1">
        <button type="button" class="icon-btn d-lg-none" (click)="menuToggle.emit()" aria-label="Open navigation">
          <i class="bi bi-list"></i>
        </button>
        <button type="button" class="icon-btn d-none d-lg-inline-flex" (click)="shell.toggleCollapsed()" aria-label="Collapse navigation">
          <i class="bi bi-layout-sidebar"></i>
        </button>
      </div>

      <form class="search" (submit)="search(); $event.preventDefault()">
        <i class="bi bi-search"></i>
        <input
          #searchBox
          [formControl]="query"
          type="search"
          placeholder="Search projects, reports..."
          aria-label="Search projects, reports"
          aria-keyshortcuts="Control+K" />
        <kbd class="d-none d-sm-inline">Ctrl + K</kbd>
      </form>

      <div class="d-flex align-items-center gap-1">
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
        <button type="button" class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">
          <i class="bi" [class.bi-moon-stars]="theme.mode() === 'dark'" [class.bi-sun]="theme.mode() === 'light'"></i>
        </button>
        <div class="notify">
          <button type="button" class="avatar-btn" (click)="toggleProfile()" [attr.aria-label]="auth.displayName()">
            {{ initials }}
          </button>
          @if (profileOpen()) {
            <div class="menu">
              <p>{{ auth.displayName() }}</p>
              <p>{{ auth.organization() || 'Workspace' }} · {{ auth.role() || 'Member' }} · {{ auth.plan() }}</p>
              <a routerLink="/settings" (click)="profileOpen.set(false)">Settings</a>
              <button type="button" (click)="auth.logout()">Sign out</button>
            </div>
          }
        </div>
        <div class="tagline d-none d-xl-flex">
          <i class="bi bi-shield-check"></i>
          <span>Build Secure. Ship Confident.</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      min-height: 68px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1.15rem;
      position: sticky;
      top: 0;
      z-index: 40;
      background: color-mix(in srgb, var(--pf-bg) 82%, transparent);
      backdrop-filter: blur(16px);
    }
    .search {
      flex: 1;
      min-width: 0;
      max-width: 640px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      height: 42px;
      border: 1px solid var(--pf-border);
      border-radius: 999px;
      padding: 0 0.85rem;
      background: var(--pf-search-bg);
      color: var(--pf-text-muted);
    }
    .search:focus-within { border-color: rgba(96, 165, 250, 0.7); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18); }
    .search input {
      border: 0; outline: 0; width: 100%; min-width: 0; background: transparent; color: var(--pf-text); font: inherit; font-size: 0.88rem;
    }
    .search kbd {
      border: 1px solid var(--pf-border);
      border-radius: 8px;
      padding: 0.12rem 0.4rem;
      font-size: 0.68rem;
      color: var(--pf-text-muted);
      background: transparent;
      white-space: nowrap;
    }
    .icon-btn, .avatar-btn {
      border: 0; background: transparent; color: var(--pf-text-muted); border-radius: 999px;
      width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; position: relative;
    }
    .icon-btn:hover { background: rgba(148, 163, 184, 0.12); color: var(--pf-text); }
    .avatar-btn {
      background: linear-gradient(135deg, #60a5fa, #2563eb);
      color: white; font-weight: 800; font-size: 0.72rem;
    }
    .notify { position: relative; }
    .dot {
      position: absolute; top: 2px; right: 0; background: #ef4444; color: white; border-radius: 99px;
      font-size: 0.62rem; min-width: 16px; height: 16px; display: grid; place-items: center; padding: 0 0.2rem;
    }
    .menu {
      position: absolute; right: 0; top: 46px; width: min(300px, 78vw); background: var(--pf-card);
      border: 1px solid var(--pf-border); border-radius: 14px; padding: 0.4rem; box-shadow: var(--pf-shadow); z-index: 30;
    }
    .menu a, .menu button, .menu p {
      display: flex; flex-direction: column; width: 100%; text-align: left; background: transparent; border: 0;
      color: inherit; padding: 0.45rem 0.55rem; border-radius: 8px; text-decoration: none;
    }
    .menu a:hover, .menu button:hover { background: var(--pf-card-hover); }
    .menu span, .menu p { color: var(--pf-text-muted); font-size: 0.78rem; }
    .tagline {
      align-items: center; gap: 0.4rem; margin-left: 0.35rem; color: var(--pf-text-muted);
      font-weight: 800; font-size: 0.82rem; white-space: nowrap;
    }
    .tagline i { color: #3b82f6; }
  `]
})
export class NavbarComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();
  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly shell = inject(ShellService);
  private readonly projects = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

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

  get initials(): string {
    const parts = this.auth.displayName().split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (this.auth.displayName().slice(0, 2) || 'PF').toUpperCase();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchBox?.nativeElement.focus();
      this.searchBox?.nativeElement.select();
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.notesOpen.set(false);
      this.profileOpen.set(false);
    }
  }

  search(): void {
    const term = this.query.value.trim();
    this.router.navigate(['/vulnerabilities'], { queryParams: term ? { q: term } : {} });
  }

  toggleNotes(): void {
    this.notesOpen.update((open) => !open);
    this.profileOpen.set(false);
  }

  toggleProfile(): void {
    this.profileOpen.update((open) => !open);
    this.notesOpen.set(false);
  }
}
