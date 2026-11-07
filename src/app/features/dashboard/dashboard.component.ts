import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, ScriptableContext, registerables } from 'chart.js';
import { timeout } from 'rxjs';
import { ScoreCardComponent } from '../../shared/components/score-card/score-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ScanProgressComponent } from '../../shared/components/scan-progress/scan-progress.component';
import { ScanService } from '../../core/services/scan.service';
import { ProjectService } from '../../core/services/project.service';
import { LoggerService } from '../../core/services/logger.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import {
  DashboardSummary,
  HealthMetric,
  ProjectSummary,
  ScanTrend
} from '../../core/models/scan.model';

Chart.register(...registerables);

interface VulnSlice {
  label: string;
  value: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ScoreCardComponent, EmptyStateComponent, ScanProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pf-dash">
      @if (loading()) {
        <app-scan-progress class="d-block mb-3" title="Checking your projects" stage="Loading" message="Loading scores, open issues, and recent scans." />
        <div class="skeleton hero-skel"></div>
        <div class="stat-grid">
          @for (item of skeletons; track item) { <div class="skeleton stat-skel"></div> }
        </div>
        <div class="mid-grid">
          <div class="skeleton panel-skel"></div>
          <div class="skeleton panel-skel"></div>
        </div>
        <div class="bottom-grid">
          @for (item of skeletons.slice(0, 3); track item) { <div class="skeleton panel-skel"></div> }
        </div>
      } @else if (loadError() && !summary()) {
        <app-empty-state
          icon="bi-exclamation-triangle"
          title="Dashboard could not load"
          [message]="loadError()!" />
        <div class="text-center">
          <button type="button" class="btn btn-primary btn-sm" (click)="reload()">Try again</button>
        </div>
      } @else if (!summary() || summary()!.totalScans === 0) {
        <app-empty-state
          icon="bi-shield-check"
          title="No scans yet"
          message="Submit a GitHub repository or ZIP archive to generate the first evidence-based assessment."
          actionLabel="New scan"
          actionRoute="/scans/new" />
      } @else {
        @let scans = scanSeries();
        @let scores = scoreSeries();
        @let issues = issueSeries();
        @let durations = scanDurations();
        @let issueChange = seriesDelta(issues);
        @let scoreChange = seriesDelta(scores);
        @let durationChange = durationDeltaPct(durations);
        @let slices = vulnSlices();
        @let counts = statusCounts();

        <section class="hero">
          <div>
            <div class="welcome-pill"><i class="bi bi-stars"></i> Welcome back, {{ displayName() }}!</div>
            <div class="hero-title">
              <span class="hero-badge {{ healthTone() }}" aria-hidden="true"><i class="bi bi-shield-check"></i></span>
              <h1>Your Projects are <em class="{{ healthTone() }}">{{ healthPhrase() }}</em></h1>
            </div>
            <p class="hero-sub">Keep scanning, stay secure, and build with confidence.</p>
            <p class="hero-note">Scores are indicative assessments of detected findings, not proof a project is secure.</p>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="shield-glow"></div>
            <div class="orbit orbit-a"></div>
            <div class="orbit orbit-b"></div>
            <svg class="shield" viewBox="0 0 200 230">
              <defs>
                <linearGradient id="pfShield" x1="40" y1="20" x2="170" y2="210" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#93c5fd"/>
                  <stop offset=".45" stop-color="#3b82f6"/>
                  <stop offset="1" stop-color="#1d4ed8"/>
                </linearGradient>
                <linearGradient id="pfShieldInner" x1="70" y1="70" x2="140" y2="160" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#eff6ff"/>
                  <stop offset="1" stop-color="#60a5fa"/>
                </linearGradient>
              </defs>
              <path d="M100 16 176 48v62c0 50-30 86-76 104C54 196 24 160 24 110V48Z" fill="url(#pfShield)"/>
              <path d="M100 38 156 62v42c0 36-22 64-56 78-34-14-56-42-56-78V62Z" fill="url(#pfShieldInner)" opacity=".95"/>
              <path d="M78 112l16 16 32-36" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="float-card card-a"><span></span><span></span><span></span></div>
            <div class="float-card card-b"><span></span><span></span><span></span></div>
            <div class="float-laptop"><span></span><span></span><span></span></div>
          </div>
        </section>

        <section class="stat-grid">
          <a class="stat-card stat-card--blue" routerLink="/projects">
            <span class="stat-icon"><i class="bi bi-layers"></i></span>
            <span class="stat-value">{{ summary()!.totalProjects }}</span>
            <span class="stat-label">Total Projects</span>
            <svg class="spark" viewBox="0 0 96 36" aria-hidden="true"><polyline [attr.points]="sparkPoints(scans)" /></svg>
          </a>
          <a class="stat-card stat-card--green" routerLink="/projects">
            <span class="stat-icon"><i class="bi bi-shield-check"></i></span>
            <span class="stat-value">{{ counts.secure }}</span>
            <span class="stat-label">Secure Projects</span>
            <svg class="spark" viewBox="0 0 96 36" aria-hidden="true"><polyline [attr.points]="sparkPoints(scores)" /></svg>
            @if (scoreChange !== null) {
              <span class="delta" [class.up]="scoreChange >= 0" [class.down]="scoreChange < 0">
                @if (scoreChange > 0) { <i class="bi bi-arrow-up-short"></i> }
                @if (scoreChange < 0) { <i class="bi bi-arrow-down-short"></i> }
                {{ formatSigned(scoreChange) }}
              </span>
            }
          </a>
          <a class="stat-card stat-card--red" routerLink="/vulnerabilities">
            <span class="stat-icon"><i class="bi bi-exclamation-triangle"></i></span>
            <span class="stat-value">{{ issueTotal() }}</span>
            <span class="stat-label">Issues Found</span>
            <svg class="spark" viewBox="0 0 96 36" aria-hidden="true"><polyline [attr.points]="sparkPoints(issues)" /></svg>
            @if (issueChange !== null) {
              <span class="delta" [class.up]="issueChange <= 0" [class.down]="issueChange > 0">
                @if (issueChange > 0) { <i class="bi bi-arrow-up-short"></i> }
                @if (issueChange < 0) { <i class="bi bi-arrow-down-short"></i> }
                {{ formatSigned(issueChange) }}
              </span>
            }
          </a>
          <a class="stat-card stat-card--purple" routerLink="/history">
            <span class="stat-icon"><i class="bi bi-clock"></i></span>
            <span class="stat-value">{{ avgScanLabel() }}</span>
            <span class="stat-label">Avg Scan Time</span>
            <svg class="spark" viewBox="0 0 96 36" aria-hidden="true"><polyline [attr.points]="sparkPoints(durations)" /></svg>
            @if (durationChange !== null) {
              <span class="delta" [class.up]="durationChange <= 0" [class.down]="durationChange > 0">
                @if (durationChange > 0) { <i class="bi bi-arrow-up-short"></i> }
                @if (durationChange < 0) { <i class="bi bi-arrow-down-short"></i> }
                {{ formatSigned(durationChange) }}%
              </span>
            }
          </a>
        </section>

        <section class="mid-grid">
          <article class="dash-card">
            <div class="card-head">
              <h2>Security Overview</h2>
              <div class="card-tools">
                <div class="legend-inline">
                  <span><i class="swatch-blue"></i>Scans</span>
                  <span><i class="swatch-red"></i>Issues</span>
                </div>
                <select class="range-select" [value]="range()" (change)="onRange($event)" aria-label="Chart range">
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>
            @if (scans.length) {
              <div class="pf-chart-wrap pf-chart-wrap--line">
                <canvas #trendChart aria-label="Scans and issues over time"></canvas>
              </div>
            } @else {
              <p class="quiet">Trend data appears after scans are recorded.</p>
            }
          </article>

          <article class="dash-card">
            <div class="card-head">
              <h2>Top Vulnerability Types</h2>
              <a routerLink="/vulnerabilities" class="link-all">View All →</a>
            </div>
            @if (slices.length) {
              <div class="vuln-body">
                <div class="donut-stage">
                  <canvas #categoryChart aria-label="Vulnerability types"></canvas>
                  <div class="donut-center">
                    <strong>{{ vulnTotal(slices) }}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <ul class="vuln-legend">
                  @for (slice of slices; track slice.label) {
                    <li>
                      <i [style.background]="slice.color"></i>
                      <span>{{ slice.label }}</span>
                      <strong>{{ slice.pct }}%</strong>
                    </li>
                  }
                </ul>
              </div>
            } @else {
              <p class="quiet">No categorized findings yet.</p>
            }
          </article>
        </section>

        <section class="bottom-grid">
          <article class="dash-card">
            <div class="card-head">
              <h2>Recent Scans</h2>
              <a routerLink="/history" class="link-all">View All →</a>
            </div>
            <div class="scan-list">
              @for (project of recentProjects(); track project.projectId) {
                <a class="scan-row" [routerLink]="project.latestScanResultId ? ['/scans', project.latestScanResultId] : ['/projects']">
                  <span class="scan-ico"><i class="bi {{ scanIcon(project) }}"></i></span>
                  <span class="min-w-0">
                    <span class="scan-title">{{ scanTitle(project) }}</span>
                    <span class="scan-sub">{{ scanWhen(project) }}</span>
                  </span>
                  <span class="status-pill" [class]="scanPill(project)">
                    <i class="bi" [class.bi-check-circle-fill]="project.issueCount === 0" [class.bi-exclamation-octagon-fill]="project.issueCount > 0"></i>
                    {{ project.issueCount === 0 ? 'No Issues' : project.issueCount + (project.issueCount === 1 ? ' Issue' : ' Issues') }}
                  </span>
                </a>
              } @empty {
                <p class="quiet">No recent scans</p>
              }
            </div>
          </article>

          <article class="dash-card status-card">
            <h2 class="mb-3">Project Security Status</h2>
            <div class="status-body">
              <button type="button" class="gauge" [style.background]="gaugeBackground()" (click)="openMetric('overall')" aria-label="Open overall health details">
                <span class="gauge-label"><strong>{{ overallScore() }}%</strong></span>
              </button>
              <ul class="status-legend">
                <li><i class="dot good"></i> {{ counts.secure }} Secure</li>
                <li><i class="dot warn"></i> {{ counts.attention }} Needs Attention</li>
                <li><i class="dot bad"></i> {{ counts.risk }} At Risk</li>
              </ul>
            </div>
            <div class="status-foot">
              <span>Overall Security Score</span>
              <span class="foot-delta">
                <svg class="spark" viewBox="0 0 96 36" aria-hidden="true"><polyline [attr.points]="sparkPoints(scores)" /></svg>
                @if (scoreChange !== null) {
                  <strong [class.up]="scoreChange >= 0" [class.down]="scoreChange < 0">
                    {{ scoreChange >= 0 ? '↑' : '↓' }} {{ formatSigned(scoreChange) }}%
                  </strong>
                }
              </span>
            </div>
            <p class="quiet">{{ summary()!.resolvedIssues ?? 0 }} findings marked resolved.</p>
          </article>

          <a class="ai-card" routerLink="/assistant">
            <div>
              <h2>ProdFalcon AI Assistant</h2>
              <p>{{ aiBlurb() }}</p>
              @if (extraRecommendations() > 0) {
                <p class="ai-more">+{{ extraRecommendations() }} more insights in chat</p>
              }
              <span class="ai-cta">Chat Now <i class="bi bi-arrow-right"></i></span>
            </div>
            <svg class="ai-bot" viewBox="0 0 120 140" aria-hidden="true">
              <ellipse cx="60" cy="126" rx="28" ry="6" fill="rgba(255,255,255,.2)"/>
              <rect x="34" y="36" width="52" height="46" rx="18" fill="#eff6ff"/>
              <circle cx="50" cy="58" r="5" fill="#1d4ed8"/>
              <circle cx="70" cy="58" r="5" fill="#1d4ed8"/>
              <path d="M52 70h16" stroke="#1d4ed8" stroke-width="3" stroke-linecap="round"/>
              <path d="M60 36v-10" stroke="#dbeafe" stroke-width="3" stroke-linecap="round"/>
              <circle cx="60" cy="22" r="4" fill="#bfdbfe"/>
              <rect x="42" y="86" width="36" height="28" rx="12" fill="#dbeafe"/>
              <path d="M86 96l16 8-16 6v-6h-8v-4h8z" fill="#fff"/>
            </svg>
          </a>
        </section>

        <section class="metrics-block">
          <div class="card-head">
            <h2>Category health</h2>
            <a routerLink="/reports" class="link-all">Open analytics →</a>
          </div>
          <div class="metric-grid">
            @for (metric of metrics(); track metric.key) {
              <app-score-card
                [label]="metric.label"
                [score]="metric.score"
                [icon]="metric.icon"
                [clickable]="true"
                [compact]="true"
                [metricKey]="metric.key"
                (cardClick)="openMetric($event)" />
            }
          </div>
        </section>
      }
    </div>

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
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('trendChart') trendChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef?: ElementRef<HTMLCanvasElement>;

  private readonly scanService = inject(ScanService);
  private readonly projectService = inject(ProjectService);
  private readonly logger = inject(LoggerService);
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly trends = signal<ScanTrend[]>([]);
  readonly selectedMetric = signal<HealthMetric | null>(null);
  readonly metrics = signal<HealthMetric[]>([]);
  readonly range = signal<'7' | '30' | '90'>('30');
  readonly skeletons = [1, 2, 3, 4];

  private charts: Chart[] = [];
  private chartTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      const mode = this.theme.mode();
      const range = this.range();
      const summary = this.summary();
      const trendCount = this.trends().length;
      const loading = this.loading();
      if (loading || !summary || summary.totalScans === 0) {
        this.destroyCharts();
        return;
      }
      this.scheduleCharts(mode, range, trendCount);
    });
  }

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.summary.set(null);
    this.projects.set([]);
    this.trends.set([]);
    this.metrics.set([]);
    this.load();
  }

  private load(): void {
    this.logger.info('Dashboard loading');
    let pending = 3;
    let failed = false;
    const done = (error = false): void => {
      if (error) failed = true;
      pending -= 1;
      if (pending > 0) return;
      this.loading.set(false);
      if (failed && !this.summary()) {
        this.loadError.set('Scores and scans did not come back in time. Check that the API is running, then try again.');
      }
    };

    this.scanService.getSummary().pipe(timeout(20000)).subscribe({
      next: (response) => {
        if (response.success) {
          this.summary.set(response.data);
          this.metrics.set(this.buildMetrics(response.data));
        } else {
          failed = true;
        }
        done();
      },
      error: () => done(true)
    });

    this.projectService.getProjects().pipe(timeout(20000)).subscribe({
      next: (response) => {
        if (response.success) this.projects.set(response.data);
        else failed = true;
        done();
      },
      error: () => done(true)
    });

    this.scanService.getTrends().pipe(timeout(20000)).subscribe({
      next: (response) => {
        if (response.success) this.trends.set(response.data);
        else failed = true;
        done();
      },
      error: () => done(true)
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.chartTimer !== null) clearTimeout(this.chartTimer);
    this.destroyCharts();
  }

  displayName(): string {
    return this.auth.displayName();
  }

  healthTone(): 'good' | 'warn' | 'bad' {
    const score = this.summary()?.averageScore ?? 0;
    if (score >= 80) return 'good';
    if (score >= 60) return 'warn';
    return 'bad';
  }

  healthPhrase(): string {
    const tone = this.healthTone();
    if (tone === 'good') return 'Secure & Healthy';
    if (tone === 'warn') return 'Needs Attention';
    return 'At Risk';
  }

  overallScore(): number {
    return Math.round(this.summary()?.averageScore ?? 0);
  }

  issueTotal(): number {
    const summary = this.summary();
    if (!summary) return 0;
    return summary.openIssues ?? summary.totalIssues ?? 0;
  }

  onRange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.range.set(value === '7' || value === '90' ? value : '30');
  }

  filteredTrends(): ScanTrend[] {
    const all = this.trends();
    if (!all.length) return [];
    const cutoff = Date.now() - Number(this.range()) * 86400000;
    const filtered = all.filter((row) => {
      const time = new Date(row.date).getTime();
      return Number.isFinite(time) && time >= cutoff;
    });
    return filtered.length ? filtered : all;
  }

  scanSeries(): number[] {
    return this.filteredTrends().map((row) => row.scanCount);
  }

  scoreSeries(): number[] {
    return this.filteredTrends().map((row) => row.averageScore);
  }

  issueSeries(): number[] {
    return this.filteredTrends().map((row) => row.issueCount);
  }

  scanDurations(): number[] {
    return [...this.projects()]
      .filter((project) => (project.latestDurationMs ?? 0) > 0)
      .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
      .map((project) => project.latestDurationMs ?? 0);
  }

  seriesDelta(values: number[]): number | null {
    if (values.length < 2) return null;
    return Math.round((values[values.length - 1] - values[values.length - 2]) * 10) / 10;
  }

  durationDeltaPct(values: number[]): number | null {
    if (values.length < 2 || !values[values.length - 2]) return null;
    const previous = values[values.length - 2];
    return Math.round(((values[values.length - 1] - previous) / previous) * 100);
  }

  formatSigned(value: number): string {
    const rounded = Math.abs(value) >= 10 || Number.isInteger(value)
      ? Math.round(value)
      : Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }

  avgScanLabel(): string {
    const samples = this.scanDurations();
    if (!samples.length) return '—';
    const ms = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const minutes = ms / 60000;
    if (minutes >= 1) {
      const shown = minutes >= 10 ? Math.round(minutes).toString() : (Math.round(minutes * 10) / 10).toString();
      return `${shown} min`;
    }
    return `${Math.max(1, Math.round(ms / 1000))} sec`;
  }

  sparkPoints(values: number[]): string {
    const series = values.length ? values : [0, 0];
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    return series.map((value, index) => {
      const x = series.length === 1 ? 48 : (index / (series.length - 1)) * 96;
      const y = 4 + (1 - (value - min) / span) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  vulnSlices(): VulnSlice[] {
    const summary = this.summary();
    if (!summary) return [];
    const source = Object.keys(summary.issuesByCategory ?? {}).length
      ? summary.issuesByCategory
      : summary.issuesBySeverity ?? {};
    const entries = Object.entries(source).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return [];
    const top = entries.slice(0, 3);
    const rest = entries.slice(3).reduce((sum, entry) => sum + entry[1], 0);
    const rows: [string, number][] = rest > 0 ? [...top, ['Others', rest]] : top;
    const total = rows.reduce((sum, entry) => sum + entry[1], 0) || 1;
    const colors = ['#ff4d6d', '#f5a524', '#a855f7', '#3b82f6'];
    let used = 0;
    return rows.map(([label, value], index) => {
      const pct = index === rows.length - 1 ? Math.max(0, 100 - used) : Math.round((value / total) * 100);
      used += pct;
      return { label, value, pct, color: colors[index] ?? '#3b82f6' };
    });
  }

  vulnTotal(slices: VulnSlice[]): number {
    return slices.reduce((sum, slice) => sum + slice.value, 0);
  }

  statusCounts(): { secure: number; attention: number; risk: number } {
    const counts = { secure: 0, attention: 0, risk: 0 };
    for (const project of this.projects()) {
      const health = this.projectService.getHealth(project.latestScore, project.issueCount);
      if (health === 'Healthy') counts.secure += 1;
      else if (health === 'Warning') counts.attention += 1;
      else counts.risk += 1;
    }
    return counts;
  }

  gaugeBackground(): string {
    const { secure, attention, risk } = this.statusCounts();
    const total = secure + attention + risk;
    if (!total) return 'conic-gradient(rgba(148, 163, 184, 0.28) 0% 100%)';
    const safe = (secure / total) * 100;
    const warnEnd = safe + (attention / total) * 100;
    return `conic-gradient(#34d399 0% ${safe}%, #fbbf24 ${safe}% ${warnEnd}%, #fb7185 ${warnEnd}% 100%)`;
  }

  recentProjects(): ProjectSummary[] {
    return [...this.projects()]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 3);
  }

  scanTitle(project: ProjectSummary): string {
    if (project.repositoryUrl) return project.repositoryUrl.replace(/^https?:\/\//, '').replace(/\.git$/, '');
    return project.displayName || project.fileName;
  }

  scanIcon(project: ProjectSummary): string {
    const url = project.repositoryUrl ?? '';
    if (url.includes('github.com')) return 'bi-github';
    if (url) return 'bi-globe2';
    return 'bi-file-earmark-zip';
  }

  scanWhen(project: ProjectSummary): string {
    const state = project.latestStatus || project.status;
    const when = this.relativeTime(project.uploadedAt);
    if (state && !['Completed', 'Succeeded', 'Complete'].includes(state)) return `${state} · ${when}`;
    return `Completed · ${when}`;
  }

  scanPill(project: ProjectSummary): string {
    const state = (project.latestStatus || project.status || '').toLowerCase();
    if (state === 'failed') return 'status-pill bad';
    if (project.issueCount === 0) return 'status-pill ok';
    if (project.issueCount < 5) return 'status-pill warn';
    return 'status-pill bad';
  }

  aiBlurb(): string {
    const recommendation = this.summary()?.aiRecommendations?.find((item) => !!item?.trim());
    return recommendation || 'Ask anything about security, get instant insights!';
  }

  extraRecommendations(): number {
    const count = this.summary()?.aiRecommendations?.filter((item) => !!item?.trim()).length ?? 0;
    return Math.max(0, count - 1);
  }

  openMetric(key: string): void {
    const metric = this.metrics().find((item) => item.key === key)
      ?? (key === 'overall'
        ? {
            key: 'overall',
            label: 'Overall Health',
            icon: 'bi-heart-pulse',
            score: this.summary()?.averageScore ?? 0,
            description: 'Composite production readiness across security, maintainability, performance, and architecture.'
          }
        : null);
    if (!metric) return;
    this.selectedMetric.set(metric);
    this.logger.info('Opened metric detail', { key: metric.key });
  }

  closeMetric(): void {
    this.selectedMetric.set(null);
  }

  private relativeTime(value: string): string {
    const then = new Date(value).getTime();
    if (!Number.isFinite(then)) return 'recently';
    const minutes = Math.round((Date.now() - then) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  private buildMetrics(summary: DashboardSummary): HealthMetric[] {
    return [
      { key: 'security', label: 'Security score', icon: 'bi-shield-lock', score: summary.averageSecurityScore, description: 'Average of security scores calculated from open findings.' },
      { key: 'maintainability', label: 'Maintainability', icon: 'bi-tools', score: summary.averageMaintainabilityScore, description: 'Score from quality and maintainability findings.' },
      { key: 'performance', label: 'Performance', icon: 'bi-lightning-charge', score: summary.averagePerformanceScore, description: 'Score from performance findings.' },
      { key: 'production', label: 'Configuration', icon: 'bi-sliders', score: summary.averageProductionReadinessScore, description: 'Score from configuration and production-hardening findings.' },
      { key: 'architecture', label: 'Architecture', icon: 'bi-diagram-3', score: summary.architectureScore, description: 'Starts at 100. Only open Architecture findings reduce it. A score of 100 means none were stored, not that the design was approved.' },
      { key: 'complexity', label: 'Complexity', icon: 'bi-share', score: summary.complexityScore, description: 'Starts at 100 and falls only when a high-complexity finding is open. Documentation and test coverage are not measured.' }
    ];
  }

  private scheduleCharts(mode: string, range: string, trendCount: number): void {
    if (this.destroyed || !mode || !range || trendCount < 0) return;
    if (this.chartTimer !== null) clearTimeout(this.chartTimer);
    this.chartTimer = setTimeout(() => {
      this.chartTimer = null;
      this.renderCharts();
    }, 0);
  }

  private renderCharts(attempt = 0): void {
    if (this.destroyed) return;
    const summary = this.summary();
    if (this.loading() || !summary || summary.totalScans === 0) return;
    const trends = this.filteredTrends();
    const slices = this.vulnSlices();
    const waiting = (trends.length > 0 && !this.trendChartRef?.nativeElement)
      || (slices.length > 0 && !this.categoryChartRef?.nativeElement);
    if (waiting && attempt < 8) {
      setTimeout(() => this.renderCharts(attempt + 1), 40);
      return;
    }

    this.destroyCharts();
    const muted = this.cssVar('--pf-text-muted', '#93a4c3');
    const grid = this.cssVar('--pf-chart-grid', 'rgba(148,163,184,0.12)');
    const card = this.cssVar('--pf-card', '#101a33');

    if (this.trendChartRef?.nativeElement && trends.length) {
      this.charts.push(new Chart(this.trendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: trends.map((row) => this.shortDate(row.date)),
          datasets: [
            {
              label: 'Scans',
              data: trends.map((row) => row.scanCount),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.16)',
              tension: 0.42,
              fill: true,
              borderWidth: 2.5,
              pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === context.dataset.data.length - 1 ? 4 : 0,
              pointHoverRadius: 5,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
            {
              label: 'Issues',
              data: trends.map((row) => row.issueCount),
              borderColor: '#fb7185',
              backgroundColor: 'transparent',
              tension: 0.42,
              fill: false,
              borderWidth: 2.5,
              pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === context.dataset.data.length - 1 ? 4 : 0,
              pointHoverRadius: 5,
              pointBackgroundColor: '#fb7185',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 18, right: 8 } },
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#0b1224', borderColor: 'rgba(148,163,184,0.2)', borderWidth: 1 }
          },
          scales: {
            x: { ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false }, border: { display: false } },
            y: { beginAtZero: true, ticks: { color: muted, precision: 0, maxTicksLimit: 5 }, grid: { color: grid }, border: { display: false } }
          }
        },
        plugins: [{
          id: 'pfEndLabels',
          afterDatasetsDraw(chart: Chart): void {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, index) => {
              const point = chart.getDatasetMeta(index).data.at(-1);
              const raw = dataset.data.at(-1);
              if (!point || typeof raw !== 'number') return;
              ctx.save();
              ctx.font = '700 11px "Plus Jakarta Sans", Inter, sans-serif';
              ctx.fillStyle = String(dataset.borderColor ?? '#93c5fd');
              ctx.textAlign = 'right';
              ctx.textBaseline = 'bottom';
              ctx.fillText(`${raw} ${dataset.label ?? ''}`.trim(), point.x - 8, point.y - 6);
              ctx.restore();
            });
          }
        }]
      }));
    }

    if (this.categoryChartRef?.nativeElement && slices.length) {
      this.charts.push(new Chart(this.categoryChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: slices.map((slice) => slice.label),
          datasets: [{
            data: slices.map((slice) => slice.value),
            backgroundColor: slices.map((slice) => slice.color),
            borderColor: card,
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: { legend: { display: false } }
        }
      }));
    }

    this.logger.debug('Dashboard charts rendered', { count: this.charts.length, theme: this.theme.mode() });
  }

  private shortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private cssVar(name: string, fallback: string): string {
    const value = getComputedStyle(document.body).getPropertyValue(name).trim();
    return value || fallback;
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }
}
