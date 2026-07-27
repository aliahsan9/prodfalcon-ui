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
import { Chart, registerables } from 'chart.js';
import { ScanService } from '../../core/services/scan.service';
import { LoggerService } from '../../core/services/logger.service';
import { DashboardSummary } from '../../core/models/scan.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [PageHeaderComponent, SkeletonLoaderComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Reports & analytics"
      subtitle="Risk analytics, severity mix, and rule violation breakdown"
      actionLabel="New scan"
      actionRoute="/upload"
      actionIcon="bi-cloud-upload" />

    @if (loading()) {
      <app-skeleton-loader [count]="4" [columns]="4" [height]="100" />
    } @else if (!summary() || summary()!.totalScans === 0) {
      <app-empty-state
        title="No report data"
        message="Run a scan to generate executive analytics."
        actionLabel="Upload project"
        actionRoute="/upload" />
    } @else {
      <div class="row g-3">
        <div class="col-6 col-md-3"><div class="pf-card text-center"><div class="text-muted small">Total scans</div><div class="h3 mb-0">{{ summary()!.totalScans }}</div></div></div>
        <div class="col-6 col-md-3"><div class="pf-card text-center"><div class="text-muted small">Total issues</div><div class="h3 mb-0">{{ summary()!.totalIssues }}</div></div></div>
        <div class="col-6 col-md-3"><div class="pf-card text-center"><div class="text-muted small">Avg score</div><div class="h3 mb-0">{{ summary()!.averageScore }}</div></div></div>
        <div class="col-6 col-md-3"><div class="pf-card text-center"><div class="text-muted small">Projects</div><div class="h3 mb-0">{{ summary()!.totalProjects }}</div></div></div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-6">
          <div class="pf-card">
            <h2 class="h6 mb-3">Issues by severity</h2>
            <canvas #severityChart height="180"></canvas>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="pf-card">
            <h2 class="h6 mb-3">Issues by category</h2>
            <canvas #categoryChart height="180"></canvas>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="pf-card">
            <h2 class="h6">Severity breakdown</h2>
            @for (item of severityEntries(); track item[0]) {
              <div class="d-flex justify-content-between small py-2 border-bottom" style="border-color: var(--pf-border) !important;">
                <span>{{ item[0] }}</span><span class="badge badge-severity-{{ item[0].toLowerCase() }}">{{ item[1] }}</span>
              </div>
            }
          </div>
        </div>
        <div class="col-lg-6">
          <div class="pf-card">
            <h2 class="h6">Top violated rules</h2>
            @for (item of ruleEntries(); track item[0]) {
              <div class="d-flex justify-content-between small py-2 border-bottom" style="border-color: var(--pf-border) !important;">
                <span class="text-truncate me-2">{{ item[0] }}</span><span>{{ item[1] }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('severityChart') severityChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef?: ElementRef<HTMLCanvasElement>;

  private readonly scanService = inject(ScanService);
  private readonly logger = inject(LoggerService);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  private charts: Chart[] = [];
  private viewReady = false;

  ngOnInit(): void {
    this.logger.info('Reports page loading');
    this.scanService.getSummary().subscribe({
      next: (r) => {
        if (r.success) this.summary.set(r.data);
        this.loading.set(false);
        this.renderCharts();
      },
      error: () => this.loading.set(false)
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c.destroy());
  }

  severityEntries(): [string, number][] {
    return Object.entries(this.summary()?.issuesBySeverity ?? {});
  }

  ruleEntries(): [string, number][] {
    return Object.entries(this.summary()?.topViolatedRules ?? {});
  }

  private renderCharts(): void {
    if (this.loading() || !this.viewReady || !this.summary()) return;
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    const muted = getComputedStyle(document.body).getPropertyValue('--pf-text-muted').trim() || '#94a3b8';

    const sev = Object.entries(this.summary()!.issuesBySeverity ?? {});
    if (this.severityChartRef?.nativeElement && sev.length) {
      this.charts.push(new Chart(this.severityChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: sev.map((e) => e[0]),
          datasets: [{ data: sev.map((e) => e[1]), backgroundColor: ['#ef4444', '#f59e0b', '#38bdf8', '#22c55e'] }]
        },
        options: { plugins: { legend: { labels: { color: muted } } } }
      }));
    }

    const cats = Object.entries(this.summary()!.issuesByCategory ?? {});
    if (this.categoryChartRef?.nativeElement && cats.length) {
      this.charts.push(new Chart(this.categoryChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: cats.map((e) => e[0]),
          datasets: [{ data: cats.map((e) => e[1]), backgroundColor: '#6366f1', borderRadius: 8 }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: muted } },
            y: { ticks: { color: muted } }
          }
        }
      }));
    }
  }
}
