import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ScoreCardComponent } from '../../shared/components/score-card/score-card.component';
import { ScanService } from '../../core/services/scan.service';
import { ProjectService } from '../../core/services/project.service';
import { DashboardSummary, ProjectSummary, ScanTrend } from '../../core/models/scan.model';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ScoreCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4">
      <h1 class="h3 mb-1">Dashboard</h1>
      <p class="text-muted mb-0">
        Your projects are <strong>{{ summary()?.averageScore ?? 0 }}%</strong> production ready on average
      </p>
    </div>

    @if (loading()) {
      <div class="skeleton" style="height: 120px;"></div>
    } @else {
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-xl-3">
          <app-score-card label="Overall Risk" [score]="summary()?.averageScore ?? 0" icon="bi-speedometer2" />
        </div>
        <div class="col-md-6 col-xl-3">
          <app-score-card label="Security" [score]="avgSecurity()" icon="bi-shield-lock" />
        </div>
        <div class="col-md-6 col-xl-3">
          <app-score-card label="Maintainability" [score]="avgMaintainability()" icon="bi-tools" />
        </div>
        <div class="col-md-6 col-xl-3">
          <app-score-card label="Production Ready" [score]="avgProduction()" icon="bi-rocket-takeoff" />
        </div>
      </div>
    }

    <div class="row g-3">
      <div class="col-lg-8">
        <div class="pf-card">
          <h2 class="h6 mb-3">Risk trend (last scans)</h2>
          <canvas #trendChart height="120"></canvas>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="pf-card mb-3">
          <h2 class="h6 mb-3">Quick actions</h2>
          <div class="d-grid gap-2">
            <a routerLink="/upload" class="btn btn-primary"><i class="bi bi-cloud-upload me-1"></i> Upload ZIP</a>
            <a routerLink="/projects" class="btn btn-outline-secondary">View projects</a>
            <a routerLink="/ai-suggestions" class="btn btn-outline-secondary">AI suggestions</a>
          </div>
        </div>
        <div class="pf-card">
          <h2 class="h6 mb-2">AI insight</h2>
          <p class="small text-muted mb-0">{{ insight() }}</p>
        </div>
      </div>
      <div class="col-12">
        <div class="pf-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h6 mb-0">Recent projects</h2>
            <a routerLink="/projects" class="small">View all</a>
          </div>
          <div class="table-responsive">
            <table class="table table-dark table-hover align-middle mb-0">
              <thead><tr><th>Project</th><th>Score</th><th>Issues</th><th>Trend</th></tr></thead>
              <tbody>
                @for (p of projects().slice(0, 5); track p.projectId) {
                  <tr>
                    <td>{{ p.fileName }}</td>
                    <td>{{ p.latestScore }}/100</td>
                    <td>{{ p.issueCount }}</td>
                    <td><span class="badge text-bg-secondary">{{ p.trend }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly scanService = inject(ScanService);
  private readonly projectService = inject(ProjectService);

  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly trends = signal<ScanTrend[]>([]);
  private chart?: Chart;

  ngOnInit(): void {
    this.scanService.getSummary().subscribe({
      next: (r) => { if (r.success) this.summary.set(r.data); }
    });
    this.projectService.getProjects().subscribe({
      next: (r) => {
        if (r.success) this.projects.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.scanService.getTrends().subscribe({
      next: (r) => {
        if (r.success) {
          this.trends.set(r.data);
          this.renderChart();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  avgSecurity(): number { return this.summary()?.averageScore ?? 0; }
  avgMaintainability(): number { return Math.max(0, (this.summary()?.averageScore ?? 0) - 5); }
  avgProduction(): number { return this.summary()?.averageScore ?? 0; }

  insight(): string {
    const trend = this.projects()[0]?.trend ?? 'Stable';
    if (trend === 'Degrading') return 'Your codebase is trending toward instability. Run a new scan and review security issues.';
    if (trend === 'Improving') return 'Great progress this week. Consider enabling CI/CD scans on every PR.';
    return 'Recommended: upload a new build and generate an AI remediation report.';
  }

  private renderChart(): void {
    if (!this.trendChartRef?.nativeElement || !this.trends().length) return;
    this.chart?.destroy();
    const labels = this.trends().map((t) => new Date(t.date).toLocaleDateString());
    this.chart = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Avg score',
          data: this.trends().map((t) => t.averageScore),
          borderColor: '#8b5cf6',
          tension: 0.35,
          fill: true,
          backgroundColor: 'rgba(139, 92, 246, 0.15)'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
    });
  }
}

