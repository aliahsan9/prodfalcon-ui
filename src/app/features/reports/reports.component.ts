import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ScanService } from '../../core/services/scan.service';
import { DashboardSummary } from '../../core/models/scan.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1">Reports & analytics</h1>
    <p class="text-muted mb-4">Risk analytics and rule violation breakdown</p>

    @if (summary()) {
      <div class="row g-3">
        <div class="col-md-3"><div class="pf-card text-center"><div class="text-muted small">Total scans</div><div class="h3 mb-0">{{ summary()!.totalScans }}</div></div></div>
        <div class="col-md-3"><div class="pf-card text-center"><div class="text-muted small">Total issues</div><div class="h3 mb-0">{{ summary()!.totalIssues }}</div></div></div>
        <div class="col-md-3"><div class="pf-card text-center"><div class="text-muted small">Avg score</div><div class="h3 mb-0">{{ summary()!.averageScore }}</div></div></div>
        <div class="col-md-3"><div class="pf-card text-center"><div class="text-muted small">Projects</div><div class="h3 mb-0">{{ summary()!.totalProjects }}</div></div></div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-6">
          <div class="pf-card">
            <h2 class="h6">Issues by severity</h2>
            @for (item of severityEntries(); track item[0]) {
              <div class="d-flex justify-content-between small py-1 border-bottom">
                <span>{{ item[0] }}</span><span>{{ item[1] }}</span>
              </div>
            }
          </div>
        </div>
        <div class="col-lg-6">
          <div class="pf-card">
            <h2 class="h6">Top violated rules</h2>
            @for (item of ruleEntries(); track item[0]) {
              <div class="d-flex justify-content-between small py-1 border-bottom">
                <span class="text-truncate me-2">{{ item[0] }}</span><span>{{ item[1] }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ReportsComponent implements OnInit {
  private readonly scanService = inject(ScanService);
  readonly summary = signal<DashboardSummary | null>(null);

  ngOnInit(): void {
    this.scanService.getSummary().subscribe({
      next: (r) => { if (r.success) this.summary.set(r.data); }
    });
  }

  severityEntries(): [string, number][] {
    return Object.entries(this.summary()?.issuesBySeverity ?? {});
  }

  ruleEntries(): [string, number][] {
    return Object.entries(this.summary()?.topViolatedRules ?? {});
  }
}
