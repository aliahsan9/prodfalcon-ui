import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, switchMap } from 'rxjs';
import { ProjectService } from '../../core/services/project.service';
import { ScanService } from '../../core/services/scan.service';
import { LoggerService } from '../../core/services/logger.service';
import { ToastService } from '../../core/services/toast.service';
import { ProjectSummary } from '../../core/models/scan.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ScanProgressComponent } from '../../shared/components/scan-progress/scan-progress.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    ScanProgressComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Projects"
      subtitle="Scan a GitHub repository again, or open a project while a check is running"
      actionLabel="New scan"
      actionRoute="/scans/new"
      actionIcon="bi-plus-lg" />

    <div class="pf-card mb-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-8">
          <input
            class="form-control"
            placeholder="Search projects..."
            [(ngModel)]="query"
            (ngModelChange)="filter()" />
        </div>
        <div class="col-md-4">
          <select class="form-select" [(ngModel)]="healthFilter" (ngModelChange)="filter()">
            <option value="all">All health</option>
            <option value="Healthy">Healthy</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>
    </div>

    @if (loading()) {
      <app-scan-progress
        class="d-block mb-3"
        title="Checking your projects"
        stage="Loading"
        message="Loading the latest scan status for every project." />
      <app-skeleton-loader [count]="6" [columns]="3" [height]="160" />
    } @else {
      <div class="project-grid">
        @for (p of filtered(); track p.projectId) {
          <article class="pf-card project-card" [class.is-checking]="isChecking(p)">
            <div class="project-head">
              <div class="project-avatar" aria-hidden="true">{{ initials(p.fileName) }}</div>
              <h2 class="project-name">{{ p.fileName }}</h2>
              <span class="health-pill" [class]="healthClass(p)">
                @if (isChecking(p)) {
                  <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                }
                {{ isChecking(p) ? 'Checking' : health(p) }}
              </span>
            </div>
            <p class="project-meta">
              Last scan {{ p.uploadedAt | date:'medium' }} · {{ p.scanCount }} scan(s)
            </p>
            <div class="project-stats">
              <span>Risk <strong>{{ p.latestScore }}/100</strong></span>
              <span>{{ p.issueCount }} issues</span>
              <span>Security <strong>{{ p.latestSecurityScore ?? '—' }}</strong></span>
              <span>Trend <strong>{{ p.trend }}</strong></span>
            </div>
            <div class="progress project-meter" aria-hidden="true">
              <div class="progress-bar" [style.width.%]="p.latestScore"
                   [class.bg-success]="p.latestScore >= 80"
                   [class.bg-warning]="p.latestScore >= 60 && p.latestScore < 80"
                   [class.bg-danger]="p.latestScore < 60"></div>
            </div>
            <div class="project-actions">
              @if (p.repositoryUrl) {
                <button class="act act-primary" type="button" [disabled]="isChecking(p)" (click)="scanAgain(p)">
                  @if (isChecking(p)) {
                    <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span>Scanning</span>
                  } @else {
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                    <span>Scan again</span>
                  }
                </button>
              }
              @if (p.latestScanResultId) {
                <a [routerLink]="['/scans', p.latestScanResultId]" class="act act-accent">
                  <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                  <span>Open</span>
                </a>
                <a [routerLink]="['/architecture']" [queryParams]="{ scanId: p.latestScanResultId }" class="act">
                  <i class="bi bi-diagram-3" aria-hidden="true"></i>
                  <span>Architecture</span>
                </a>
                <a [routerLink]="['/assistant']" [queryParams]="{ scanResultId: p.latestScanResultId }" class="act">
                  <i class="bi bi-stars" aria-hidden="true"></i>
                  <span>Copilot</span>
                </a>
              }
              <a [routerLink]="['/vulnerabilities']" [queryParams]="{ projectId: p.projectId }" class="act">
                <i class="bi bi-shield-check" aria-hidden="true"></i>
                <span>Security</span>
              </a>
              <a [routerLink]="['/quality']" [queryParams]="{ projectId: p.projectId }" class="act">
                <i class="bi bi-patch-check" aria-hidden="true"></i>
                <span>Quality</span>
              </a>
            </div>
          </article>
        } @empty {
          <app-empty-state
            title="No projects yet"
            message="Upload a ZIP to start scanning your first codebase."
            actionLabel="Upload ZIP"
            actionRoute="/upload"
            icon="bi-folder2-open" />
        }
      </div>
      @if (active()) {
        <div class="mt-3">
          <app-scan-progress
            [title]="'Scanning ' + active()!.fileName"
            [stage]="active()!.stage"
            [message]="active()!.message" />
        </div>
      }
    }
  `,
  styles: [`
    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: 1rem;
      min-width: 0;
    }
    .project-grid > app-empty-state { grid-column: 1 / -1; }
    .project-card {
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
      container-type: inline-size;
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    }
    .project-card:hover {
      transform: translateY(-2px);
      border-color: rgba(96, 165, 250, 0.38);
    }
    .project-card.is-checking { outline: 2px solid rgba(37, 99, 235, 0.45); }
    .project-head {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
      margin-bottom: 0.55rem;
    }
    .project-avatar {
      width: 36px; height: 36px; border-radius: 10px; flex: none;
      display: grid; place-items: center; font-size: .75rem; font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
    }
    .project-name {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .health-pill {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      max-width: 46%;
      border-radius: 999px;
      padding: 0.28rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 800;
      line-height: 1.2;
      white-space: nowrap;
    }
    .project-meta {
      margin: 0 0 0.65rem;
      color: var(--pf-text-muted);
      font-size: 0.78rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .project-stats {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 0.28rem 0.75rem;
      margin-bottom: 0.7rem;
      color: var(--pf-text-muted);
      font-size: 0.8rem;
    }
    .project-stats strong { color: var(--pf-text); font-weight: 700; }
    .project-stats span:nth-child(even) { text-align: right; }
    .project-meter { height: 6px; margin-bottom: 0.9rem; }
    .project-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
      margin-top: auto;
    }
    .act {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-width: 0;
      min-height: 2.2rem;
      padding: 0.35rem 0.55rem;
      border-radius: 11px;
      border: 1px solid var(--pf-border);
      background: rgba(148, 163, 184, 0.07);
      color: var(--pf-text);
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.1;
      text-decoration: none;
      transition: transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
    }
    .act i, .act .spinner-border { flex: none; font-size: 0.92rem; }
    .act span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .act:hover {
      transform: translateY(-1px);
      background: rgba(37, 99, 235, 0.16);
      border-color: rgba(96, 165, 250, 0.5);
      color: var(--pf-text);
    }
    .act:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }
    .act-primary {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 8px 16px rgba(37, 99, 235, 0.28);
    }
    .act-primary:hover { color: #fff; background: linear-gradient(135deg, #1d4ed8, #2563eb); }
    .act-primary:disabled {
      opacity: 0.72;
      transform: none;
      box-shadow: none;
      cursor: not-allowed;
    }
    .act-accent {
      color: #93c5fd;
      border-color: rgba(96, 165, 250, 0.45);
      background: rgba(37, 99, 235, 0.12);
    }
    :host-context(body.theme-light) .act-accent { color: #1d4ed8; }
    @container (max-width: 439px) {
      .project-actions .act:last-child:nth-child(odd) { grid-column: 1 / -1; }
    }
    @container (min-width: 440px) {
      .project-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .project-actions .act:last-child:nth-child(3n + 1):nth-last-child(1) { grid-column: 1 / -1; }
    }
    @container (max-width: 230px) {
      .project-actions { grid-template-columns: 1fr; }
      .health-pill { max-width: 100%; }
    }
  `]
})
export class ProjectsComponent implements OnInit, OnDestroy {
  private readonly projectService = inject(ProjectService);
  private readonly scans = inject(ScanService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly toast = inject(ToastService);
  private poll?: Subscription;

  readonly projects = signal<ProjectSummary[]>([]);
  readonly filtered = signal<ProjectSummary[]>([]);
  readonly loading = signal(true);
  readonly active = signal<{ projectId: string; scanId: number; fileName: string; stage: string; message: string } | null>(null);
  query = '';
  healthFilter = 'all';

  ngOnInit(): void {
    this.logger.info('Projects page loading');
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  scanAgain(project: ProjectSummary): void {
    if (!project.repositoryUrl || this.isChecking(project)) return;
    this.active.set({
      projectId: project.projectId,
      scanId: 0,
      fileName: project.displayName || project.fileName,
      stage: 'Submitting',
      message: 'Queueing a new scan of this repository.'
    });
    this.scans.scanGitHub(project.repositoryUrl, project.branch ?? '', '').subscribe({
      next: (response) => {
        if (!response.success) {
          this.active.set(null);
          return;
        }
        this.watch(project, response.data.scan.scanResultId);
      },
      error: () => this.active.set(null)
    });
  }

  isChecking(project: ProjectSummary): boolean {
    const active = this.active();
    if (active?.projectId === project.projectId) return true;
    return project.latestStatus === 'Queued' || project.latestStatus === 'Scanning';
  }

  private loadProjects(followRunning = true): void {
    this.projectService.getProjects().subscribe({
      next: (r) => {
        if (r.success) {
          this.projects.set(r.data);
          this.filter();
          if (followRunning && !this.active()) {
            const running = r.data.find((p) => p.latestStatus === 'Queued' || p.latestStatus === 'Scanning');
            if (running?.latestScanResultId) this.watch(running, running.latestScanResultId);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load projects');
      }
    });
  }

  private watch(project: ProjectSummary, scanId: number): void {
    this.active.set({
      projectId: project.projectId,
      scanId,
      fileName: project.displayName || project.fileName,
      stage: project.latestStatus || 'Queued',
      message: 'Checking the project. Results appear when the scan finishes.'
    });
    this.poll?.unsubscribe();
    this.poll = interval(1500).pipe(
      switchMap(() => this.scans.getScan(scanId))
    ).subscribe({
      next: (response) => {
        const scan = response.data;
        if (!scan) return;
        this.active.update((current) => current ? { ...current, stage: scan.stage || scan.status, message: scan.stageMessage || scan.status } : current);
        if (scan.status === 'Completed') {
          this.poll?.unsubscribe();
          this.active.set(null);
          this.toast.success('Scan completed');
          this.router.navigate(['/scans', scanId]);
        } else if (scan.status === 'Failed' || scan.status === 'Cancelled') {
          this.poll?.unsubscribe();
          this.active.set(null);
          this.loadProjects(false);
        }
      }
    });
  }

  filter(): void {
    const q = this.query.toLowerCase().trim();
    this.filtered.set(
      this.projects().filter((p) => {
        const matchesQuery = !q || p.fileName.toLowerCase().includes(q);
        const h = this.health(p);
        const matchesHealth = this.healthFilter === 'all' || h === this.healthFilter;
        return matchesQuery && matchesHealth;
      })
    );
  }

  health(p: ProjectSummary): string {
    return this.projectService.getHealth(p.latestScore, p.issueCount);
  }

  healthClass(p: ProjectSummary): string {
    const h = this.health(p);
    return h === 'Healthy' ? 'text-bg-success' : h === 'Warning' ? 'text-bg-warning' : 'text-bg-danger';
  }

  initials(name: string): string {
    const clean = name.replace(/\.zip$/i, '');
    const parts = clean.split(/[-_\s.]/).filter(Boolean);
    return ((parts[0]?.[0] ?? 'P') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
}
