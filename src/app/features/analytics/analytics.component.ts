import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AnalyticsOverview, PlatformService } from '../../core/services/platform.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Scan analytics"
      subtitle="See how scores, open risk, and quality gates moved across every project in this workspace." />

    <div class="d-flex justify-content-end mb-3">
      <label class="small text-muted me-2 align-self-center" for="range">Range</label>
      <select id="range" class="form-select form-select-sm w-auto" [ngModel]="days()" (ngModelChange)="changeDays($event)">
        <option [ngValue]="30">Last 30 days</option>
        <option [ngValue]="90">Last 90 days</option>
        <option [ngValue]="180">Last 180 days</option>
      </select>
    </div>

    @if (loading()) {
      <p class="text-muted">Loading workspace history…</p>
    } @else if (!overview() || overview()!.scanCount === 0) {
      <app-empty-state
        icon="bi-graph-up"
        title="No scan history in this range"
        message="Run a repository scan and this page will chart the score, open findings, and gate results."
        actionLabel="Scan a repository"
        actionRoute="/integrations" />
    } @else {
      @let data = overview()!;
      <section class="stat-row">
        <article class="pf-card"><span>Scans</span><strong>{{ data.scanCount }}</strong></article>
        <article class="pf-card"><span>Average score</span><strong>{{ data.averageScore }}</strong></article>
        <article class="pf-card"><span>Score change</span><strong>{{ data.scoreChange > 0 ? '+' : '' }}{{ data.scoreChange }}</strong></article>
        <article class="pf-card"><span>Open critical</span><strong>{{ data.openCritical }}</strong></article>
        <article class="pf-card"><span>Resolved</span><strong>{{ data.resolvedIssues }}</strong></article>
      </section>

      <section class="pf-card my-3">
        <h2 class="h6">Score by day</h2>
        @if (data.points.length === 0) {
          <p class="text-muted mb-0">Completed scans will draw a bar for each day.</p>
        } @else {
          <div class="bars" aria-label="Average score by day">
            @for (point of data.points; track point.day) {
              <div class="bar-col">
                <div class="bar" [style.height.%]="barHeight(point.averageScore)" [attr.title]="point.averageScore + ' on ' + point.scans + ' scans'"></div>
                <span>{{ shortDay(point.day) }}</span>
              </div>
            }
          </div>
        }
      </section>

      <section class="pf-card mb-3">
        <h2 class="h6">Projects</h2>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Project</th>
                <th>Score</th>
                <th>Security</th>
                <th>Critical</th>
                <th>High</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              @for (project of data.projects; track project.projectId) {
                <tr>
                  <td>
                    @if (project.latestScanResultId) {
                      <a [routerLink]="['/scans', project.latestScanResultId]">{{ project.name }}</a>
                    } @else {
                      {{ project.name }}
                    }
                  </td>
                  <td>{{ project.latestScore }}</td>
                  <td>{{ project.securityScore }}</td>
                  <td>{{ project.openCritical }}</td>
                  <td>{{ project.openHigh }}</td>
                  <td>{{ project.trend }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="text-muted">Projects appear after the first scan.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="pf-card">
        <h2 class="h6">Recent quality gates</h2>
        @for (gate of data.recentGates; track gate.id) {
          <p class="mb-1">
            <span class="badge me-1" [class.text-bg-success]="gate.status === 'Passed'" [class.text-bg-danger]="gate.status === 'Failed'" [class.text-bg-secondary]="gate.status !== 'Passed' && gate.status !== 'Failed'">{{ gate.status }}</span>
            {{ gate.owner }}/{{ gate.name }} #{{ gate.number }}
            <span class="text-muted small">{{ gate.summary }}</span>
          </p>
        } @empty {
          <p class="text-muted mb-0">Gate results appear after a pull request scan or a GitHub Actions run.</p>
        }
      </section>
    }
  `,
  styles: [`
    .stat-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.75rem; }
    .stat-row span { display: block; color: var(--pf-text-muted); font-size: 0.78rem; }
    .stat-row strong { font-size: 1.35rem; }
    .bars { display: flex; align-items: flex-end; gap: 0.45rem; min-height: 160px; overflow-x: auto; padding-top: 0.5rem; }
    .bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 2.4rem; height: 160px; }
    .bar { width: 1.1rem; min-height: 4px; border-radius: 999px 999px 4px 4px; background: linear-gradient(180deg, #60a5fa, #1d4ed8); }
    .bar-col span { margin-top: 0.35rem; font-size: 0.68rem; color: var(--pf-text-muted); }
    @media (max-width: 900px) { .stat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `]
})
export class AnalyticsComponent implements OnInit {
  private readonly platform = inject(PlatformService);

  readonly days = signal(30);
  readonly loading = signal(true);
  readonly overview = signal<AnalyticsOverview | null>(null);

  ngOnInit(): void {
    this.load();
  }

  changeDays(days: number): void {
    this.days.set(Number(days));
    this.load();
  }

  barHeight(score: number): number {
    return Math.max(8, Math.min(100, score));
  }

  shortDay(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private load(): void {
    this.loading.set(true);
    this.platform.analytics(this.days()).subscribe({
      next: (response) => {
        this.overview.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
