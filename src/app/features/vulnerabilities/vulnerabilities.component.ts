import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ScanProgressComponent } from '../../shared/components/scan-progress/scan-progress.component';
import { ScanService } from '../../core/services/scan.service';
import { ToastService } from '../../core/services/toast.service';
import { ScanIssue } from '../../core/models/scan.model';

@Component({
  selector: 'app-vulnerabilities',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent, ScanProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="title" [subtitle]="subtitle" />
    <form class="pf-card mb-3" [formGroup]="filters" (ngSubmit)="load()">
      <div class="row g-2">
        <div class="col-6 col-md-2">
          <select class="form-select" formControlName="severity" aria-label="Severity">
            <option value="">All severities</option>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Info</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <select class="form-select" formControlName="status" aria-label="Status">
            <option value="">All statuses</option>
            <option>Open</option><option>Detected</option><option>Acknowledged</option><option>InProgress</option><option>Resolved</option><option>Verified</option><option>AcceptedRisk</option>
          </select>
        </div>
        <div class="col-12 col-md-3">
          <input class="form-control" formControlName="category" placeholder="Category" aria-label="Category" />
        </div>
        <div class="col-12 col-md-3">
          <input class="form-control" formControlName="q" placeholder="File, title, or rule" aria-label="Search" />
        </div>
        <div class="col-12 col-md-2">
          <button class="btn btn-primary w-100" type="submit">Filter</button>
        </div>
      </div>
    </form>

    @if (loading()) {
      <app-scan-progress title="Checking findings" stage="Loading" message="Loading security and quality results for your projects." />
    } @else if (items().length === 0) {
      <app-empty-state title="No findings match" message="Run a scan or clear the filters." actionLabel="New scan" actionRoute="/scans/new" />
    } @else {
      @for (issue of items(); track issue.id) {
        <article class="pf-card mb-2">
          <button class="btn btn-link p-0 text-start" type="button" (click)="selected.set(selected() === issue.id ? null : (issue.id ?? null))">
            <strong>{{ issue.title }}</strong>
          </button>
          <div class="small text-muted">{{ issue.severity }} · {{ issue.status || 'Open' }} · {{ issue.category }} · {{ issue.filePath }}:{{ issue.lineNumber }}</div>
          @if (selected() === issue.id) {
            <p class="mt-2 mb-1">{{ issue.description }}</p>
            <p class="small mb-1">{{ issue.impact }}</p>
            <p class="small mb-1"><strong>Evidence:</strong> {{ issue.evidence || 'Redacted or unavailable.' }}</p>
            <p class="small mb-1"><strong>Fix:</strong> {{ issue.remediation || issue.fixSuggestion }}</p>
            @if (issue.secureExample) { <pre class="small">{{ issue.secureExample }}</pre> }
            <p class="small text-muted">Resolved is not verified. A later scan marks it Verified only when the same fingerprint is gone.</p>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="setStatus(issue, 'Acknowledged')">Acknowledge</button>
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="setStatus(issue, 'InProgress')">In progress</button>
              <button class="btn btn-sm btn-outline-success" type="button" (click)="setStatus(issue, 'Resolved')">Mark resolved</button>
              <button class="btn btn-sm btn-outline-secondary" type="button" (click)="setStatus(issue, 'AcceptedRisk')">Accept risk</button>
              <button class="btn btn-sm btn-outline-primary" type="button" (click)="setStatus(issue, 'Open')">Reopen</button>
              <a class="btn btn-sm btn-outline-primary" [routerLink]="['/assistant']" [queryParams]="{ findingId: issue.id }">Explain</a>
            </div>
          }
        </article>
      }
      <p class="small text-muted">{{ total() }} findings</p>
    }
  `
})
export class VulnerabilitiesComponent implements OnInit {
  private readonly scans = inject(ScanService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly items = signal<ScanIssue[]>([]);
  readonly total = signal(0);
  readonly selected = signal<number | null>(null);
  title = 'Security Center';
  subtitle = 'Security findings from completed scans. Status changes are written to the server.';
  private scope = 'security';
  private projectId = '';
  readonly filters = this.formBuilder.nonNullable.group({
    severity: '',
    status: '',
    category: '',
    q: ''
  });

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path ?? 'vulnerabilities';
    if (path === 'quality') {
      this.scope = 'quality';
      this.title = 'Code quality';
      this.subtitle = 'Maintainability, architecture, reliability, and static performance findings. These are not confirmed vulnerabilities.';
    } else if (path === 'remediation') {
      this.scope = '';
      this.title = 'Remediation';
      this.subtitle = 'Detected, acknowledged, in progress, resolved, and accepted risk. A later scan records Verified only after a resolved finding is gone.';
    }
    const q = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') ?? '';
    if (q) this.filters.patchValue({ q });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const raw = this.filters.getRawValue();
    const params: Record<string, string> = { page: '1', pageSize: '50' };
    if (this.scope) params['scope'] = this.scope;
    if (this.projectId) params['projectId'] = this.projectId;
    Object.entries(raw).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    this.scans.getFindings(params).subscribe({
      next: (response) => {
        this.items.set(response.data?.items ?? []);
        this.total.set(response.data?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setStatus(issue: ScanIssue, status: string): void {
    if (!issue.id) return;
    const notes = window.prompt('Optional note for this status change') ?? '';
    this.scans.updateFinding(issue.id, status, notes).subscribe({
      next: (response) => {
        if (!response.success) return;
        this.toast.success('Finding updated');
        this.load();
      }
    });
  }
}
