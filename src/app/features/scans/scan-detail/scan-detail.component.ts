import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { ScoreCardComponent } from '../../../shared/components/score-card/score-card.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ScanProgressComponent } from '../../../shared/components/scan-progress/scan-progress.component';
import { ScanService } from '../../../core/services/scan.service';
import { CollaborationNote, PlatformService } from '../../../core/services/platform.service';
import { ToastService } from '../../../core/services/toast.service';
import { ScanIssue, ScanResult } from '../../../core/models/scan.model';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, ScoreCardComponent, SkeletonLoaderComponent, EmptyStateComponent, ScanProgressComponent],
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
      <div class="scan-page">
        <header class="scan-head">
          <div class="scan-head__copy">
            <h1>{{ scan()!.projectName || ('Scan #' + scan()!.scanResultId) }}</h1>
            <p class="scan-meta">
              <span>{{ scan()!.status }}</span>
              <span>{{ scan()!.stageMessage || scan()!.stage }}</span>
              <span>{{ scan()!.durationMs }} ms</span>
              @if (scan()!.branch) { <span>{{ scan()!.branch }}</span> }
            </p>
            @if (scan()!.repositoryUrl) {
              <p class="scan-url">{{ scan()!.repositoryUrl }}</p>
            }
          </div>
          <div class="scan-actions">
            <div class="scan-exports" role="group" aria-label="Download report">
              <button class="btn btn-outline-secondary" type="button" (click)="download('json')">JSON</button>
              <button class="btn btn-outline-secondary" type="button" (click)="download('csv')">CSV</button>
              <button class="btn btn-outline-secondary" type="button" (click)="download('pdf')">PDF</button>
            </div>
            <a
              class="btn btn-primary scan-ask"
              [routerLink]="['/assistant']"
              [queryParams]="{ scanResultId: scan()!.scanResultId }">
              <i class="bi bi-robot" aria-hidden="true"></i>
              Ask assistant
            </a>
          </div>
        </header>

        <div class="scan-scores">
          <app-score-card label="Indicative score" [score]="scan()!.overallScore" variant="circular" />
          <app-score-card label="Security" [score]="scan()!.securityScore" [compact]="true" />
          <app-score-card label="Quality" [score]="scan()!.maintainabilityScore" [compact]="true" />
          <app-score-card label="Performance" [score]="scan()!.performanceScore" [compact]="true" />
          <app-score-card label="Config" [score]="scan()!.productionReadinessScore" [compact]="true" />
        </div>

        <div class="pf-card scan-summary">
          <div class="scan-summary__row">
            <div>
              <strong>{{ scan()!.riskLevel || 'Unrated' }} risk</strong>
              <span class="text-muted"> · {{ scan()!.fileCount || 0 }} files · {{ scan()!.totalIssues }} findings</span>
              @if (scan()!.previousScore !== null && scan()!.previousScore !== undefined) {
                <span class="text-muted"> · previous {{ scan()!.previousScore }} ({{ scan()!.scoreChange }})</span>
              }
            </div>
            <div class="scan-tech">{{ (scan()!.technologies || []).join(', ') || 'No technologies detected' }}</div>
          </div>
          <p class="scan-note">{{ scan()!.scoringNote }}</p>
        </div>

        <div class="scan-filters" role="group" aria-label="Filter by severity">
          @for (sev of severityFilters; track sev) {
            <button class="btn" [class.btn-primary]="severity() === sev" [class.btn-outline-secondary]="severity() !== sev" type="button" (click)="severity.set(sev)">{{ sev }}</button>
          }
        </div>

        @for (issue of visible(); track issue.id || issue.title + issue.filePath) {
          <article class="pf-card finding">
            <div class="finding__head">
              <button class="finding__title" type="button" (click)="open.set(open() === issue.id ? null : (issue.id ?? null))">
                {{ issue.title }}
              </button>
              <span class="badge text-bg-secondary">{{ issue.severity }}</span>
            </div>
            <p class="finding__meta">{{ issue.category }} · {{ issue.confidence || 'High' }} confidence · {{ location(issue) }} · {{ issue.status || 'Open' }}</p>
            @if (open() === issue.id) {
              <p class="finding__body">{{ issue.description }}</p>
              <p><strong>Impact.</strong> {{ issue.impact }}</p>
              <p><strong>Evidence.</strong> {{ issue.evidence || 'No raw secret is stored.' }}</p>
              <p><strong>Fix.</strong> {{ issue.remediation || issue.fixSuggestion }}</p>
              @if (issue.cwe || issue.cve) { <p>{{ issue.cwe }} {{ issue.cve }}</p> }
              @if (issue.references) { <p><strong>References.</strong> {{ issue.references }}</p> }
              @if (issue.secureExample) { <pre>{{ issue.secureExample }}</pre> }
              <div class="finding__actions">
                <button class="btn btn-outline-success" type="button" (click)="setStatus(issue, 'Resolved')">Resolve</button>
                <button class="btn btn-outline-secondary" type="button" (click)="setStatus(issue, 'AcceptedRisk')">Accept risk</button>
                <button class="btn btn-outline-primary" type="button" (click)="setStatus(issue, 'Open')">Reopen</button>
                <a
                  class="btn btn-primary finding__ask"
                  [routerLink]="['/assistant']"
                  [queryParams]="{ scanResultId: scan()!.scanResultId, findingId: issue.id }">
                  Ask assistant
                </a>
                <a
                  class="btn btn-outline-primary"
                  [routerLink]="['/ai-suggestions']"
                  [queryParams]="{ scanResultId: scan()!.scanResultId }">
                  Review patch
                </a>
              </div>
            }
          </article>
        } @empty {
          <p class="text-muted">No findings for this filter.</p>
        }

        <section class="pf-card mt-3">
          <h2 class="h6">Team notes</h2>
          <p class="small text-muted">Leave a note for the people reviewing this scan. Viewers can read notes.</p>
          @if (canComment()) {
            <textarea class="form-control mb-2" rows="3" [value]="noteDraft()" (input)="noteDraft.set(text($event))" placeholder="What should the team look at?"></textarea>
            <button class="btn btn-primary btn-sm" type="button" (click)="addNote()" [disabled]="noteBusy()">Add note</button>
          }
          <div class="mt-3">
            @for (note of notes(); track note.id) {
              <article class="note">
                <strong>{{ note.authorName }}</strong>
                <span class="text-muted small">{{ note.createdAt | date:'medium' }}</span>
                <p class="mb-0">{{ note.body }}</p>
              </article>
            } @empty {
              <p class="text-muted mb-0">No notes on this scan yet.</p>
            }
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    :host { display: block; min-width: 0; max-width: 100%; }
    .scan-page { min-width: 0; max-width: 100%; }
    .scan-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.9rem 1.25rem;
      margin-bottom: 1rem;
    }
    .scan-head__copy { flex: 1 1 18rem; min-width: 0; }
    .scan-head h1 {
      margin: 0 0 0.35rem;
      font-size: clamp(1.25rem, 2.4vw, 1.55rem);
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .scan-meta, .scan-url, .scan-note, .scan-tech, .finding__meta, .finding p {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .scan-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.7rem;
      margin: 0;
      color: var(--pf-text-muted);
      font-size: 0.84rem;
    }
    .scan-meta span:not(:last-child)::after { content: "·"; margin-left: 0.7rem; }
    .scan-url {
      margin: 0.35rem 0 0;
      color: var(--pf-text-muted);
      font-size: 0.8rem;
    }
    .scan-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      flex: 1 1 26rem;
      min-width: min(100%, 26rem);
    }
    .scan-exports { display: flex; flex-wrap: wrap; gap: 0.5rem; flex: 0 0 auto; }
    .scan-ask { flex: 0 0 auto; }
    .scan-exports .btn, .scan-ask, .scan-filters .btn, .finding__actions .btn {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .scan-ask {
      gap: 0.4rem;
      padding-inline: 0.95rem;
      white-space: nowrap;
      font-weight: 700;
    }
    .scan-scores {
      display: grid;
      grid-template-columns: minmax(220px, 1.35fr) repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }
    .scan-scores > * { display: block; min-width: 0; height: 100%; }
    .scan-summary { margin-bottom: 0.85rem; }
    .scan-summary__row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.45rem 1rem;
    }
    .scan-tech { color: var(--pf-text); font-size: 0.84rem; flex: 1 1 12rem; text-align: right; }
    .scan-note { margin: 0.6rem 0 0; color: var(--pf-text-muted); font-size: 0.84rem; }
    .scan-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.85rem;
    }
    .finding { margin-bottom: 0.55rem; }
    .finding__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .finding__title {
      min-width: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--pf-text);
      font-weight: 700;
      text-align: left;
      overflow-wrap: anywhere;
    }
    .finding__title:hover { color: var(--pf-primary); }
    .finding__head .badge { flex: none; margin-top: 0.15rem; }
    .finding__meta { margin: 0.35rem 0 0; color: var(--pf-text-muted); font-size: 0.8rem; }
    .finding__body { margin: 0.75rem 0 0.35rem; }
    .finding p { margin: 0 0 0.35rem; font-size: 0.9rem; }
    .finding pre {
      margin: 0 0 0.7rem;
      max-width: 100%;
      overflow-x: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 0.8rem;
    }
    .finding__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.35rem; }
    .note { padding: 0.7rem 0; border-top: 1px solid var(--pf-border); }
    .note span { margin-left: 0.45rem; }
    .finding__ask { font-weight: 700; }
    @media (max-width: 1199px) {
      .scan-scores { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scan-scores > :first-child { grid-column: 1 / -1; }
    }
    @media (max-width: 767px) {
      .scan-actions { justify-content: stretch; }
      .scan-exports { flex: 1 1 auto; }
      .scan-exports .btn { flex: 1 1 0; }
      .scan-ask { flex: 1 1 12rem; }
      .scan-tech { text-align: left; }
    }
    @media (max-width: 575px) {
      .scan-head { gap: 0.75rem; }
      .scan-actions, .scan-exports, .scan-ask, .finding__ask { width: 100%; }
      .scan-ask { min-height: 44px; }
      .scan-scores { grid-template-columns: 1fr 1fr; }
      .finding__actions .btn { flex: 1 1 calc(50% - 0.45rem); }
      .finding__actions .finding__ask { flex: 1 1 100%; min-height: 44px; }
    }
    @media (max-width: 380px) {
      .scan-scores { grid-template-columns: 1fr; }
      .scan-scores > :first-child { grid-column: auto; }
      .scan-exports { flex-direction: column; }
      .finding__actions .btn { flex-basis: 100%; }
    }
  `]
})
export class ScanDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly scans = inject(ScanService);
  private readonly platform = inject(PlatformService);
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
  readonly notes = signal<CollaborationNote[]>([]);
  readonly noteDraft = signal('');
  readonly noteBusy = signal(false);
  readonly canComment = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.canComment.set(this.platform.canScan());
    this.loadNotes(id);
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

  location(issue: ScanIssue): string {
    const column = issue.columnNumber ? `:${issue.columnNumber}` : '';
    return `${issue.filePath}:${issue.lineNumber || 1}${column}`;
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

  addNote(): void {
    const id = this.scan()?.scanResultId ?? Number(this.route.snapshot.paramMap.get('id'));
    const body = this.noteDraft().trim();
    if (!id || body.length < 2) return;
    this.noteBusy.set(true);
    this.platform.addNote(body, id).subscribe({
      next: () => {
        this.noteDraft.set('');
        this.noteBusy.set(false);
        this.toast.success('Note saved.');
        this.loadNotes(id);
      },
      error: () => this.noteBusy.set(false)
    });
  }

  text(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
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

  private loadNotes(scanResultId: number): void {
    if (!scanResultId) return;
    this.platform.notes(scanResultId).subscribe({
      next: (response) => this.notes.set(response.data ?? [])
    });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }
}
