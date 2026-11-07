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
      <div class="row g-3">
        @for (p of filtered(); track p.projectId) {
          <div class="col-md-6 col-xl-4">
            <div class="pf-card project-card h-100" [class.is-checking]="isChecking(p)">
              <div class="d-flex justify-content-between mb-2 gap-2">
                <div class="d-flex align-items-center gap-2 min-w-0">
                  <div class="project-avatar">{{ initials(p.fileName) }}</div>
                  <h2 class="h6 mb-0 text-truncate">{{ p.fileName }}</h2>
                </div>
                <span class="badge flex-shrink-0" [class]="healthClass(p)">
                  @if (isChecking(p)) {
                    <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                  }
                  {{ isChecking(p) ? 'Checking' : health(p) }}
                </span>
              </div>
              <p class="small text-muted mb-2">
                Last scan: {{ p.uploadedAt | date:'medium' }} · {{ p.scanCount }} scan(s)
              </p>
              <div class="row g-2 small mb-2">
                <div class="col-6">Risk: <strong>{{ p.latestScore }}/100</strong></div>
                <div class="col-6 text-end">{{ p.issueCount }} issues</div>
                <div class="col-6">Security: {{ p.latestSecurityScore ?? '—' }}</div>
                <div class="col-6 text-end">Trend: {{ p.trend }}</div>
              </div>
              <div class="progress mb-3" style="height: 6px;">
                <div class="progress-bar" [style.width.%]="p.latestScore"
                     [class.bg-success]="p.latestScore >= 80"
                     [class.bg-warning]="p.latestScore >= 60 && p.latestScore < 80"
                     [class.bg-danger]="p.latestScore < 60"></div>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                @if (p.repositoryUrl) {
                  <button class="btn btn-primary btn-sm" type="button" [disabled]="isChecking(p)" (click)="scanAgain(p)">
                    @if (isChecking(p)) { Scanning… } @else { Scan again }
                  </button>
                }
                @if (p.latestScanResultId) {
                  <a [routerLink]="['/scans', p.latestScanResultId]" class="btn btn-outline-primary btn-sm">Open</a>
                  <a [routerLink]="['/architecture']" [queryParams]="{ scanId: p.latestScanResultId }" class="btn btn-outline-secondary btn-sm">Architecture</a>
                  <a [routerLink]="['/assistant']" [queryParams]="{ scanResultId: p.latestScanResultId }" class="btn btn-outline-secondary btn-sm">Copilot</a>
                }
                <a [routerLink]="['/vulnerabilities']" [queryParams]="{ projectId: p.projectId }" class="btn btn-outline-secondary btn-sm">Security</a>
                <a [routerLink]="['/quality']" [queryParams]="{ projectId: p.projectId }" class="btn btn-outline-secondary btn-sm">Quality</a>
              </div>
            </div>
          </div>
        } @empty {
          <div class="col-12">
            <app-empty-state
              title="No projects yet"
              message="Upload a ZIP to start scanning your first codebase."
              actionLabel="Upload ZIP"
              actionRoute="/upload"
              icon="bi-folder2-open" />
          </div>
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
    .project-card { transition: transform .2s, box-shadow .2s; min-width: 0; }
    .project-card.is-checking { outline: 2px solid rgba(37, 99, 235, 0.45); }
    .project-avatar {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: grid; place-items: center; font-size: .75rem; font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
    }
    @media (max-width: 575px) {
      .project-card .btn { flex: 1 1 auto; }
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
