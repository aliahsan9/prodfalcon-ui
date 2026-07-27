import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ScoreCardComponent } from '../../../shared/components/score-card/score-card.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ScanService } from '../../../core/services/scan.service';
import { LoggerService } from '../../../core/services/logger.service';
import { ScanIssue, ScanResult } from '../../../core/models/scan.model';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [RouterLink, ScoreCardComponent, SkeletonLoaderComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-skeleton-loader [count]="5" [columns]="5" [height]="110" />
      <div class="skeleton mt-3" style="height: 240px;"></div>
    } @else if (!scan()) {
      <app-empty-state
        title="Scan not found"
        message="This scan may have been removed or the ID is invalid."
        actionLabel="Back to projects"
        actionRoute="/projects"
        icon="bi-search" />
    } @else {
      <div class="d-flex justify-content-between align-items-start mb-3 mb-md-4 flex-wrap gap-2 pf-fade-in">
        <div class="min-w-0">
          <h1 class="h3 mb-1 pf-page-title">Scan #{{ scan()!.scanResultId }}</h1>
          <p class="text-muted small mb-0 pf-break-word">
            <span class="pf-truncate-path d-inline-block" style="max-width: min(100%, 420px); vertical-align: bottom;">{{ scan()!.projectPath }}</span>
            · {{ scan()!.status }} · {{ scan()!.durationMs }}ms
          </p>
        </div>
        <div class="d-flex gap-2 flex-wrap w-100 w-sm-auto scan-actions">
          <a routerLink="/projects" class="btn btn-outline-secondary btn-sm">Projects</a>
          <a [routerLink]="['/ai-suggestions']" [queryParams]="{ scanResultId: scan()!.scanResultId }" class="btn btn-primary btn-sm">
            <i class="bi bi-robot me-1"></i> AI suggestions
          </a>
        </div>
      </div>

      <div class="row g-2 g-md-3 mb-4">
        <div class="col-12 col-sm-6 col-md">
          <app-score-card label="Overall" [score]="scan()!.overallScore" variant="circular" />
        </div>
        <div class="col-6 col-md"><app-score-card label="Security" [score]="scan()!.securityScore" icon="bi-shield-lock" [compact]="true" /></div>
        <div class="col-6 col-md"><app-score-card label="Maintainability" [score]="scan()!.maintainabilityScore" icon="bi-tools" [compact]="true" /></div>
        <div class="col-6 col-md"><app-score-card label="Performance" [score]="scan()!.performanceScore" icon="bi-lightning" [compact]="true" /></div>
        <div class="col-6 col-md"><app-score-card label="Production" [score]="scan()!.productionReadinessScore" icon="bi-rocket" [compact]="true" /></div>
      </div>

      <div class="pf-card mb-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <h2 class="h6 mb-0">{{ scan()!.totalIssues }} issues found</h2>
          <div class="d-flex gap-1 flex-wrap severity-filters">
            @for (sev of severityFilters; track sev) {
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-primary]="severityFilter() === sev"
                [class.btn-outline-secondary]="severityFilter() !== sev"
                (click)="severityFilter.set(sev)">
                {{ sev }}
              </button>
            }
          </div>
        </div>
      </div>

      @for (cat of categories; track cat.key) {
        <div class="pf-card mb-3">
          <h2 class="h6 mb-3">{{ cat.label }} ({{ filteredIssues(cat.key).length }})</h2>
          @for (issue of filteredIssues(cat.key); track issue.title + issue.filePath + (issue.lineNumber ?? 0)) {
            <div class="issue-item border-bottom py-3" style="border-color: var(--pf-border) !important;">
              <div class="d-flex justify-content-between gap-2 flex-wrap">
                <strong class="pf-break-word">{{ issue.title }}</strong>
                <span class="badge badge-severity-{{ issue.severity.toLowerCase() }} flex-shrink-0">{{ issue.severity }}</span>
              </div>
              <p class="small text-muted mb-1 pf-break-word">{{ issue.ruleName }} · {{ issue.filePath }}@if (issue.lineNumber) { :{{ issue.lineNumber }} }</p>
              <p class="small mb-1">{{ issue.description || 'Review and apply recommended fix.' }}</p>
              @if (issue.fixSuggestion) {
                <p class="small mb-0 text-primary"><i class="bi bi-lightbulb me-1"></i>{{ issue.fixSuggestion }}</p>
              }
            </div>
          } @empty {
            <p class="text-muted small mb-0">No issues in this category.</p>
          }
        </div>
      }
    }
  `,
  styles: [`
    @media (min-width: 576px) {
      .scan-actions { width: auto !important; }
    }
    .severity-filters .btn {
      min-height: 36px;
    }
  `]
})
export class ScanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly scanService = inject(ScanService);
  private readonly logger = inject(LoggerService);

  readonly loading = signal(true);
  readonly scan = signal<ScanResult | null>(null);
  readonly severityFilter = signal('All');
  readonly severityFilters = ['All', 'Critical', 'High', 'Medium', 'Low'];

  readonly categories = [
    { key: 'Security', label: 'Security' },
    { key: 'Performance', label: 'Performance' },
    { key: 'Maintainability', label: 'Architecture & Maintainability' },
    { key: 'Production', label: 'Production readiness' },
    { key: 'General', label: 'Code smells' }
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.logger.info('Loading scan detail', { id });
    this.scanService.getScan(id).subscribe({
      next: (r) => {
        if (r.success) {
          this.scan.set(r.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.logger.error('Failed to load scan', { id });
      }
    });
  }

  filteredIssues(category: string): ScanIssue[] {
    let issues = this.issuesByCategory(category);
    const sev = this.severityFilter();
    if (sev !== 'All') {
      issues = issues.filter((i) => i.severity.toLowerCase() === sev.toLowerCase());
    }
    return issues;
  }

  issuesByCategory(category: string): ScanIssue[] {
    const issues = this.scan()?.issues ?? [];
    if (category === 'General') {
      return issues.filter((i) => !['Security', 'Performance', 'Maintainability', 'Production'].includes(i.category));
    }
    return issues.filter((i) => i.category === category);
  }
}
