import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { ScoreCardComponent } from '../../../shared/components/score-card/score-card.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ScanProgressComponent } from '../../../shared/components/scan-progress/scan-progress.component';
import { ScanService } from '../../../core/services/scan.service';
import { ToastService } from '../../../core/services/toast.service';
import { ScanIssue, ScanResult } from '../../../core/models/scan.model';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [RouterLink, ScoreCardComponent, SkeletonLoaderComponent, EmptyStateComponent, ScanProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (running() || (loading() && !scan())) {
      <app-scan-progress
        class="d-block mb-3"
        [title]="running() ? 'Scanning this project' : 'Checking this scan'"
        [stage]="scan()?.stage || scan()?.status || 'Checking'"
        [message]="scan()?.stageMessage || 'Loading the latest status. This page keeps updating while the scan is running.'"
        [showCancel]="running()"
        (cancel)="cancel()" />
    }
    @if (loading() && !scan()) {
      <app-skeleton-loader [count]="4" [columns]="4" [height]="110" />
    } @else if (!scan()) {
      <app-empty-state title="Scan not found" message="This scan is not in the current workspace." actionLabel="Scan history" actionRoute="/history" />
    } @else if (!running()) {
      <div class="d-flex justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h1 class="h4 mb-1">{{ scan()!.projectName || ('Scan #' + scan()!.scanResultId) }}</h1>
          <p class="small text-muted mb-0">
            {{ scan()!.status }} · {{ scan()!.stageMessage || scan()!.stage }} · {{ scan()!.durationMs }} ms
            @if (scan()!.repositoryUrl) { · {{ scan()!.repositoryUrl }} }
            @if (scan()!.branch) { · {{ scan()!.branch }} }
          </p>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="download('json')">JSON</button>
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="download('csv')">CSV</button>
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="download('pdf')">PDF</button>
          <a class="btn btn-primary btn-sm" [routerLink]="['/assistant']">Ask assistant</a>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-12 col-md-4"><app-score-card label="Indicative score" [score]="scan()!.overallScore" variant="circular" /></div>
        <div class="col-6 col-md-2"><app-score-card label="Security" [score]="scan()!.securityScore" [compact]="true" /></div>
        <div class="col-6 col-md-2"><app-score-card label="Quality" [score]="scan()!.maintainabilityScore" [compact]="true" /></div>
        <div class="col-6 col-md-2"><app-score-card label="Performance" [score]="scan()!.performanceScore" [compact]="true" /></div>
        <div class="col-6 col-md-2"><app-score-card label="Config" [score]="scan()!.productionReadinessScore" [compact]="true" /></div>
      </div>

      <div class="pf-card mb-3">
        <div class="d-flex justify-content-between flex-wrap gap-2">
          <div>
            <strong>{{ scan()!.riskLevel || 'Unrated' }} risk</strong>
            <span class="text-muted small"> · {{ scan()!.fileCount || 0 }} files · {{ scan()!.totalIssues }} findings</span>
            @if (scan()!.previousScore !== null && scan()!.previousScore !== undefined) {
              <span class="text-muted small"> · previous {{ scan()!.previousScore }} ({{ scan()!.scoreChange }})</span>
            }
          </div>
          <div class="small">{{ (scan()!.technologies || []).join(', ') || 'No technologies detected' }}</div>
        </div>
        <p class="small text-muted mb-0 mt-2">{{ scan()!.scoringNote }}</p>
      </div>

      <div class="d-flex gap-1 flex-wrap mb-3">
        @for (sev of severityFilters; track sev) {
          <button class="btn btn-sm" [class.btn-primary]="severity() === sev" [class.btn-outline-secondary]="severity() !== sev" type="button" (click)="severity.set(sev)">{{ sev }}</button>
        }
      </div>

      @for (issue of visible(); track issue.id || issue.title + issue.filePath) {
        <article class="pf-card mb-2">
          <div class="d-flex justify-content-between gap-2">
            <button class="btn btn-link p-0 text-start" type="button" (click)="open.set(open() === issue.id ? null : (issue.id ?? null))">
              <strong>{{ issue.title }}</strong>
            </button>
            <span class="badge text-bg-secondary">{{ issue.severity }}</span>
          </div>
          <p class="small text-muted mb-0">{{ issue.category }} · {{ issue.confidence || 'High' }} confidence · {{ issue.filePath }}:{{ issue.lineNumber }} · {{ issue.status || 'Open' }}</p>
          @if (open() === issue.id) {
            <p class="mt-2 mb-1">{{ issue.description }}</p>
            <p class="small mb-1"><strong>Impact.</strong> {{ issue.impact }}</p>
            <p class="small mb-1"><strong>Evidence.</strong> {{ issue.evidence || 'No raw secret is stored.' }}</p>
            <p class="small mb-1"><strong>Fix.</strong> {{ issue.remediation || issue.fixSuggestion }}</p>
            @if (issue.cwe || issue.cve) { <p class="small mb-1">{{ issue.cwe }} {{ issue.cve }}</p> }
            @if (issue.secureExample) { <pre class="small mb-2">{{ issue.secureExample }}</pre> }
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-success" type="button" (click)="setStatus(issue, 'Resolved')">Resolve</button>
              <button class="btn btn-sm btn-outline-secondary" type="button" (click)="setStatus(issue, 'AcceptedRisk')">Accept risk</button>
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="setStatus(issue, 'Open')">Reopen</button>
            </div>
          }
        </article>
      } @empty {
        <p class="text-muted">No findings for this filter.</p>
      }
    }
  `
})
export class ScanDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly scans = inject(ScanService);
  private readonly toast = inject(ToastService);
  private poll?: Subscription;

  readonly loading = signal(true);
  readonly scan = signal<ScanResult | null>(null);
  readonly running = computed(() => {
    const status = this.scan()?.status;
    return status === 'Queued' || status === 'Scanning';
  });
  readonly severity = signal('All');
  readonly open = signal<number | null>(null);
  readonly severityFilters = ['All', 'Critical', 'High', 'Medium', 'Low', 'Info'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.poll = timer(0, 1500).pipe(
      switchMap(() => this.scans.getScan(id)),
      takeWhile((response) => ['Queued', 'Scanning'].includes(response.data?.status), true)
    ).subscribe({
      next: (response) => {
        if (response.success) this.scan.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  visible(): ScanIssue[] {
    const issues = this.scan()?.issues ?? [];
    const severity = this.severity();
    if (severity === 'All') return issues;
    return issues.filter((issue) => issue.severity.toLowerCase() === severity.toLowerCase());
  }

  setStatus(issue: ScanIssue, status: string): void {
    if (!issue.id) return;
    this.scans.updateFinding(issue.id, status, '').subscribe({
      next: (response) => {
        if (!response.success || !response.data) return;
        this.toast.success('Finding status saved');
        const current = this.scan();
        if (!current) return;
        this.scan.set({
          ...current,
          issues: current.issues.map((item) => item.id === issue.id ? { ...item, ...response.data } : item)
        });
      }
    });
  }

  cancel(): void {
    const id = this.scan()?.scanResultId;
    if (!id) return;
    this.scans.cancelScan(id).subscribe({
      next: () => this.toast.warning('Cancellation requested')
    });
  }

  download(format: 'json' | 'csv' | 'pdf'): void {
    const scan = this.scan();
    if (!scan) return;
    this.scans.downloadReport(scan.scanResultId, format).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${scan.projectName || 'scan'}-security.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }
}
