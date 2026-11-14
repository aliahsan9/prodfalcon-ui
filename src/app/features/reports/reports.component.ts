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
import { DashboardSummary, ScanHistoryItem } from '../../core/models/scan.model';
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
      subtitle="Security audit PDFs, severity mix, and rule breakdown"
      actionLabel="New scan"
      actionRoute="/scans/new"
      actionIcon="bi-shield-plus" />

    <div class="pf-card mb-3">
      <h2 class="h6">Download a scan report</h2>
      <p class="small text-muted">JSON and CSV list every finding with file, line, and column. The audit PDF adds an explanation and a suggested patch. Secret values are redacted.</p>
      @for (item of downloads(); track item.scanResultId) {
        <div class="d-flex justify-content-between align-items-center gap-2 py-1 border-bottom">
          <span class="text-truncate">{{ item.projectName }} · {{ item.score }}/100</span>
          <span class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary" type="button" (click)="download(item.scanResultId, 'json', item.projectName)">JSON</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" (click)="download(item.scanResultId, 'csv', item.projectName)">CSV</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" (click)="download(item.scanResultId, 'pdf', item.projectName)">Audit PDF</button>
          </span>
        </div>
      } @empty {
        <p class="small text-muted mb-0">Completed scans will appear here.</p>
      }
    </div>

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
        <div class="col-12 col-lg-6">
          <div class="pf-card">
            <h2 class="h6 mb-3">Issues by severity</h2>
            <div class="pf-chart-wrap">
              <canvas #severityChart height="180"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="pf-card">
            <h2 class="h6 mb-3">Issues by category</h2>
            <div class="pf-chart-wrap">
              <canvas #categoryChart height="180"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="pf-card">
            <h2 class="h6">Severity breakdown</h2>
            @for (item of severityEntries(); track item[0]) {
              <div class="d-flex justify-content-between small py-2 border-bottom gap-2" style="border-color: var(--pf-border) !important;">
                <span>{{ item[0] }}</span><span class="badge badge-severity-{{ item[0].toLowerCase() }} flex-shrink-0">{{ item[1] }}</span>
              </div>
            }
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="pf-card">
            <h2 class="h6">Top violated rules</h2>
            @for (item of ruleEntries(); track item[0]) {
              <div class="d-flex justify-content-between small py-2 border-bottom gap-2" style="border-color: var(--pf-border) !important;">
                <span class="text-truncate me-2 min-w-0">{{ item[0] }}</span><span class="flex-shrink-0">{{ item[1] }}</span>
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
  readonly downloads = signal<ScanHistoryItem[]>([]);
  readonly loading = signal(true);
  private charts: Chart[] = [];
  private viewReady = false;

  ngOnInit(): void {
    this.logger.info('Reports page loading');
    this.scanService.getHistory().subscribe({
      next: (response) => this.downloads.set((response.data?.items ?? []).filter((item) => item.status === 'Completed'))
    });
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

  download(id: number, format: 'json' | 'csv' | 'pdf', name: string): void {
    this.scanService.downloadReport(id, format).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${name || 'scan'}-security.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
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
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { labels: { color: muted, boxWidth: 12 } } }
        }
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
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: muted, maxRotation: 45, autoSkip: true, maxTicksLimit: 6 } },
            y: { ticks: { color: muted } }
          }
        }
      }));
    }
  }
}
