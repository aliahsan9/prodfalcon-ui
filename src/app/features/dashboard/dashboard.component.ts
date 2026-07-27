import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ScoreCardComponent } from '../../shared/components/score-card/score-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ScanService } from '../../core/services/scan.service';
import { ProjectService } from '../../core/services/project.service';
import { LoggerService } from '../../core/services/logger.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  DashboardSummary,
  HealthMetric,
  ProjectSummary,
  ScanTrend
} from '../../core/models/scan.model';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    ScoreCardComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    PageHeaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Engineering Health"
      [subtitle]="headerSubtitle()"
      actionLabel="New scan"
      actionRoute="/upload"
      actionIcon="bi-cloud-upload" />

    @if (loading()) {
      <app-skeleton-loader [count]="4" [columns]="4" [height]="140" />
      <div class="row g-3 mt-1">
        <div class="col-lg-8"><div class="skeleton" style="height: 280px;"></div></div>
        <div class="col-lg-4"><div class="skeleton" style="height: 280px;"></div></div>
      </div>
    } @else if (!summary() || summary()!.totalScans === 0) {
      <app-empty-state
        icon="bi-speedometer2"
        title="No scans yet"
        message="Upload a ZIP to generate your first production readiness report."
        actionLabel="Upload project"
        actionRoute="/upload" />
    } @else {
      <!-- Overall health hero -->
      <div class="row g-3 mb-3">
        <div class="col-12 col-lg-4">
          <app-score-card
            label="Overall Health Score"
            [score]="summary()!.averageScore"
            icon="bi-heart-pulse"
            variant="circular"
            [clickable]="true"
            metricKey="overall"
            hint="Production readiness pulse"
            (cardClick)="openMetric($event)" />
        </div>
        <div class="col-12 col-lg-8">
          <div class="pf-card h-100 d-flex flex-column justify-content-center">
            <div class="row text-center g-2 g-sm-3">
              <div class="col-4">
                <div class="text-muted small">Projects</div>
                <div class="h4 mb-0">{{ summary()!.totalProjects }}</div>
              </div>
              <div class="col-4">
                <div class="text-muted small">Scans</div>
                <div class="h4 mb-0">{{ summary()!.totalScans }}</div>
              </div>
              <div class="col-4">
                <div class="text-muted small">Issues</div>
                <div class="h4 mb-0">{{ summary()!.totalIssues }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metric grid -->
      <div class="row g-2 g-md-3 mb-4">
        @for (m of metrics(); track m.key) {
          <div class="col-6 col-md-4 col-xl-3">
            <app-score-card
              [label]="m.label"
              [score]="m.score"
              [icon]="m.icon"
              [clickable]="true"
              [compact]="true"
              [metricKey]="m.key"
              (cardClick)="openMetric($event)" />
          </div>
        }
      </div>

      <!-- Charts -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-lg-8">
          <div class="pf-card">
            <h2 class="h6 mb-3">Risk over time</h2>
            <div class="pf-chart-wrap">
              <canvas #trendChart height="110"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3">Issue categories</h2>
            <div class="pf-chart-wrap">
              <canvas #categoryChart height="200"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="pf-card">
            <h2 class="h6 mb-3">Architecture quality</h2>
            <div class="pf-chart-wrap">
              <canvas #radarChart height="200"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="pf-card">
            <h2 class="h6 mb-3">Security categories</h2>
            <div class="pf-chart-wrap">
              <canvas #severityChart height="200"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="pf-card">
            <h2 class="h6 mb-3">Top violated rules</h2>
            <div class="pf-chart-wrap">
              <canvas #rulesChart height="200"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Widgets -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6 col-xl-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3"><i class="bi bi-clock-history me-1"></i> Recent scans</h2>
            <ul class="pf-widget-list">
              @for (p of projects().slice(0, 5); track p.projectId) {
                <li>
                  <div class="text-truncate min-w-0">
                    <a [routerLink]="['/scans', p.latestScanResultId]">{{ p.fileName }}</a>
                    <div class="small text-muted">{{ p.uploadedAt | date:'mediumDate' }}</div>
                  </div>
                  <span class="badge text-bg-secondary flex-shrink-0">{{ p.latestScore }}</span>
                </li>
              } @empty {
                <li class="text-muted small">No recent scans</li>
              }
            </ul>
          </div>
        </div>
        <div class="col-12 col-md-6 col-xl-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3"><i class="bi bi-exclamation-triangle me-1"></i> Top risky projects</h2>
            <ul class="pf-widget-list">
              @for (p of riskyProjects(); track p.projectId) {
                <li>
                  <div class="text-truncate min-w-0">
                    <a [routerLink]="['/scans', p.latestScanResultId]">{{ p.fileName }}</a>
                    <div class="small text-muted">{{ p.issueCount }} issues · {{ p.trend }}</div>
                  </div>
                  <span class="badge flex-shrink-0" [class]="riskBadge(p.latestScore)">{{ p.latestScore }}</span>
                </li>
              } @empty {
                <li class="text-muted small">No projects</li>
              }
            </ul>
          </div>
        </div>
        <div class="col-12 col-md-6 col-xl-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3"><i class="bi bi-robot me-1"></i> AI recommendations</h2>
            <ul class="pf-widget-list">
              @for (rec of summary()!.aiRecommendations; track rec) {
                <li class="small pf-break-word">{{ rec }}</li>
              }
            </ul>
            <a routerLink="/ai-suggestions" class="btn btn-outline-primary btn-sm mt-2">Open AI assistant</a>
          </div>
        </div>
        <div class="col-12 col-md-6 col-xl-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3"><i class="bi bi-cloud-upload me-1"></i> Latest uploads</h2>
            <ul class="pf-widget-list">
              @for (p of projects().slice(0, 5); track p.projectId + '-up') {
                <li>
                  <span class="text-truncate min-w-0">{{ p.fileName }}</span>
                  <span class="small text-muted flex-shrink-0">{{ p.status }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
        <div class="col-12 col-md-6 col-xl-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3"><i class="bi bi-shield-exclamation me-1"></i> Security alerts</h2>
            <ul class="pf-widget-list">
              @for (item of severityEntries().slice(0, 5); track item[0]) {
                <li>
                  <span>{{ item[0] }}</span>
                  <span class="badge badge-severity-{{ item[0].toLowerCase() }}">{{ item[1] }}</span>
                </li>
              } @empty {
                <li class="text-muted small">No severity data</li>
              }
            </ul>
          </div>
        </div>
        <div class="col-12 col-md-6 col-xl-4">
          <div class="pf-card h-100">
            <h2 class="h6 mb-3"><i class="bi bi-stack me-1"></i> Technical debt</h2>
            <div class="display-6 fw-bold">{{ summary()!.technicalDebtScore }}</div>
            <p class="small text-muted mb-2">Debt health score (higher is better)</p>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar bg-warning" [style.width.%]="summary()!.technicalDebtScore"></div>
            </div>
            <a routerLink="/reports" class="btn btn-link btn-sm px-0 mt-2">View full report</a>
          </div>
        </div>
      </div>

      <!-- Recent projects table -->
      <div class="pf-card">
        <div class="d-flex justify-content-between align-items-center mb-3 gap-2">
          <h2 class="h6 mb-0">Recent projects</h2>
          <a routerLink="/projects" class="small flex-shrink-0">View all</a>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Project</th>
                <th>Score</th>
                <th class="d-none d-md-table-cell">Security</th>
                <th class="d-none d-sm-table-cell">Issues</th>
                <th class="d-none d-lg-table-cell">Trend</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of projects().slice(0, 8); track p.projectId) {
                <tr>
                  <td class="text-truncate" style="max-width: 140px;">{{ p.fileName }}</td>
                  <td>{{ p.latestScore }}/100</td>
                  <td class="d-none d-md-table-cell">{{ p.latestSecurityScore ?? '—' }}</td>
                  <td class="d-none d-sm-table-cell">{{ p.issueCount }}</td>
                  <td class="d-none d-lg-table-cell"><span class="badge text-bg-secondary">{{ p.trend }}</span></td>
                  <td>
                    @if (p.latestScanResultId) {
                      <a [routerLink]="['/scans', p.latestScanResultId]" class="btn btn-sm btn-outline-primary">Open</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (selectedMetric(); as metric) {
      <div class="pf-drawer-backdrop" (click)="closeMetric()"></div>
      <aside class="pf-drawer" role="dialog" aria-label="Metric detail">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h2 class="h5 mb-1">{{ metric.label }}</h2>
            <p class="text-muted small mb-0">Detailed health report</p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="closeMetric()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <app-score-card
          [label]="metric.label"
          [score]="metric.score"
          [icon]="metric.icon"
          variant="circular" />
        <p class="mt-3">{{ metric.description }}</p>
        <div class="d-grid gap-2 mt-4">
          <a routerLink="/reports" class="btn btn-primary btn-sm" (click)="closeMetric()">Open analytics</a>
          <a routerLink="/ai-suggestions" class="btn btn-outline-secondary btn-sm" (click)="closeMetric()">Ask AI to improve</a>
        </div>
      </aside>
    }
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendChart') trendChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('radarChart') radarChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('severityChart') severityChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('rulesChart') rulesChartRef?: ElementRef<HTMLCanvasElement>;

  private readonly scanService = inject(ScanService);
  private readonly projectService = inject(ProjectService);
  private readonly logger = inject(LoggerService);
  private readonly theme = inject(ThemeService);

  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly trends = signal<ScanTrend[]>([]);
  readonly selectedMetric = signal<HealthMetric | null>(null);
  readonly metrics = signal<HealthMetric[]>([]);

  private charts: Chart[] = [];
  private viewReady = false;

  ngOnInit(): void {
    this.logger.info('Dashboard loading');
    let pending = 3;
    const done = (): void => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
        this.renderCharts();
      }
    };

    this.scanService.getSummary().subscribe({
      next: (r) => {
        if (r.success) {
          this.summary.set(r.data);
          this.metrics.set(this.buildMetrics(r.data));
        }
        done();
      },
      error: () => done()
    });

    this.projectService.getProjects().subscribe({
      next: (r) => {
        if (r.success) this.projects.set(r.data);
        done();
      },
      error: () => done()
    });

    this.scanService.getTrends().subscribe({
      next: (r) => {
        if (r.success) this.trends.set(r.data);
        done();
      },
      error: () => done()
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  headerSubtitle(): string {
    const s = this.summary();
    if (!s) return 'AI-powered production readiness across your workspace';
    return `Your projects are ${s.averageScore}% production ready on average`;
  }

  riskyProjects(): ProjectSummary[] {
    return [...this.projects()].sort((a, b) => a.latestScore - b.latestScore).slice(0, 5);
  }

  severityEntries(): [string, number][] {
    return Object.entries(this.summary()?.issuesBySeverity ?? {});
  }

  riskBadge(score: number): string {
    if (score >= 80) return 'text-bg-success';
    if (score >= 60) return 'text-bg-warning';
    return 'text-bg-danger';
  }

  openMetric(key: string): void {
    const metric = this.metrics().find((m) => m.key === key)
      ?? this.metrics().find((m) => m.label === key)
      ?? {
        key: 'overall',
        label: 'Overall Health',
        icon: 'bi-heart-pulse',
        score: this.summary()?.averageScore ?? 0,
        description: 'Composite production readiness across security, maintainability, performance, and architecture.'
      };
    this.selectedMetric.set(metric);
    this.logger.info('Opened metric detail', { key: metric.key });
  }

  closeMetric(): void {
    this.selectedMetric.set(null);
  }

  private buildMetrics(s: DashboardSummary): HealthMetric[] {
    return [
      { key: 'security', label: 'Security Score', icon: 'bi-shield-lock', score: s.averageSecurityScore, description: 'Secrets, auth gaps, injection risks, and OWASP-related findings.' },
      { key: 'maintainability', label: 'Maintainability Score', icon: 'bi-tools', score: s.averageMaintainabilityScore, description: 'Code structure, smells, and long-term maintainability signals.' },
      { key: 'performance', label: 'Performance Score', icon: 'bi-lightning-charge', score: s.averagePerformanceScore, description: 'Hot paths, inefficient patterns, and performance rule hits.' },
      { key: 'architecture', label: 'Architecture Score', icon: 'bi-diagram-3', score: s.architectureScore, description: 'Blend of maintainability and performance indicating structural quality.' },
      { key: 'documentation', label: 'Documentation Score', icon: 'bi-journal-text', score: s.documentationScore, description: 'Estimated documentation health derived from maintainability signals.' },
      { key: 'coverage', label: 'Test Coverage Score', icon: 'bi-clipboard2-check', score: s.testCoverageScore, description: 'Heuristic coverage readiness until dedicated test analysis lands in Phase 4.' },
      { key: 'debt', label: 'Technical Debt Score', icon: 'bi-stack', score: s.technicalDebtScore, description: 'Inverse of smell density and critical findings — higher means healthier.' },
      { key: 'smells', label: 'Code Smells', icon: 'bi-emoji-dizzy', score: s.codeSmellsScore, description: 'How clean the codebase is relative to issue volume.' },
      { key: 'complexity', label: 'Complexity', icon: 'bi-share', score: s.complexityScore, description: 'Structural complexity inferred from maintainability and performance.' },
      { key: 'bugrisk', label: 'Bug Risk', icon: 'bi-bug', score: s.bugRiskScore, description: 'Likelihood of defects based on security posture and severity mix. Higher is safer.' },
      { key: 'production', label: 'Production Readiness', icon: 'bi-rocket-takeoff', score: s.averageProductionReadinessScore, description: 'Debug flags, logging, CORS, and release-hardening checks.' }
    ];
  }

  private renderCharts(): void {
    if (this.loading() || !this.viewReady || !this.summary()) return;
    this.destroyCharts();

    const textColor = getComputedStyle(document.body).getPropertyValue('--pf-text').trim() || '#f1f5f9';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--pf-chart-grid').trim() || 'rgba(148,163,184,0.12)';
    const muted = getComputedStyle(document.body).getPropertyValue('--pf-text-muted').trim() || '#94a3b8';

    if (this.trendChartRef?.nativeElement && this.trends().length) {
      this.charts.push(new Chart(this.trendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: this.trends().map((t) => new Date(t.date).toLocaleDateString()),
          datasets: [
            {
              label: 'Avg score',
              data: this.trends().map((t) => t.averageScore),
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              tension: 0.35,
              fill: true
            },
            {
              label: 'Issues',
              data: this.trends().map((t) => t.issueCount),
              borderColor: '#06b6d4',
              backgroundColor: 'transparent',
              tension: 0.35,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { labels: { color: muted, boxWidth: 12 } } },
          scales: {
            x: { ticks: { color: muted, maxRotation: 45, autoSkip: true, maxTicksLimit: 6 }, grid: { color: gridColor } },
            y: { min: 0, max: 100, ticks: { color: muted }, grid: { color: gridColor } },
            y1: { position: 'right', ticks: { color: muted, maxTicksLimit: 5 }, grid: { drawOnChartArea: false } }
          }
        }
      }));
    }

    const categoryEntries = Object.entries(this.summary()!.issuesByCategory ?? {});
    if (this.categoryChartRef?.nativeElement && categoryEntries.length) {
      this.charts.push(new Chart(this.categoryChartRef.nativeElement, this.barConfig(
        categoryEntries.map((e) => e[0]),
        categoryEntries.map((e) => e[1]),
        '#6366f1',
        textColor,
        muted,
        gridColor
      )));
    }

    if (this.radarChartRef?.nativeElement) {
      const s = this.summary()!;
      this.charts.push(new Chart(this.radarChartRef.nativeElement, {
        type: 'radar',
        data: {
          labels: ['Security', 'Maintainability', 'Performance', 'Architecture', 'Production', 'Debt'],
          datasets: [{
            label: 'Quality',
            data: [
              s.averageSecurityScore,
              s.averageMaintainabilityScore,
              s.averagePerformanceScore,
              s.architectureScore,
              s.averageProductionReadinessScore,
              s.technicalDebtScore
            ],
            backgroundColor: 'rgba(99, 102, 241, 0.25)',
            borderColor: '#8b5cf6',
            pointBackgroundColor: '#06b6d4'
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: { display: false },
              grid: { color: gridColor },
              pointLabels: { color: muted }
            }
          }
        }
      }));
    }

    const severityEntries = Object.entries(this.summary()!.issuesBySeverity ?? {});
    if (this.severityChartRef?.nativeElement && severityEntries.length) {
      this.charts.push(new Chart(this.severityChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: severityEntries.map((e) => e[0]),
          datasets: [{
            data: severityEntries.map((e) => e[1]),
            backgroundColor: ['#ef4444', '#f59e0b', '#38bdf8', '#22c55e', '#8b5cf6']
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: muted } } }
        }
      }));
    }

    const ruleEntries = Object.entries(this.summary()!.topViolatedRules ?? {}).slice(0, 6);
    if (this.rulesChartRef?.nativeElement && ruleEntries.length) {
      this.charts.push(new Chart(this.rulesChartRef.nativeElement, this.barConfig(
        ruleEntries.map((e) => e[0].length > 18 ? e[0].slice(0, 18) + '…' : e[0]),
        ruleEntries.map((e) => e[1]),
        '#06b6d4',
        textColor,
        muted,
        gridColor,
        true
      )));
    }

    this.logger.debug('Dashboard charts rendered', { count: this.charts.length, theme: this.theme.mode() });
  }

  private barConfig(
    labels: string[],
    data: number[],
    color: string,
    _text: string,
    muted: string,
    grid: string,
    horizontal = false
  ): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: color, borderRadius: 8, barThickness: 18 }]
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: muted }, grid: { color: grid } },
          y: { ticks: { color: muted }, grid: { color: grid } }
        }
      }
    };
  }

  private destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }
}
