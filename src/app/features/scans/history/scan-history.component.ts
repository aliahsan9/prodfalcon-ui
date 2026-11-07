import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ScanService } from '../../../core/services/scan.service';
import { ToastService } from '../../../core/services/toast.service';
import { ScanComparison, ScanHistoryItem } from '../../../core/models/scan.model';

@Component({
  selector: 'app-scan-history',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Scan history" subtitle="Previous scans stay in the database and can be compared." actionLabel="New scan" actionRoute="/scans/new" />
    @if (loading()) {
      <app-skeleton-loader [count]="3" [columns]="1" [height]="72" />
    } @else if (items().length === 0) {
      <app-empty-state title="No scans yet" message="Submit a repository or ZIP to create the first persistent scan." actionLabel="New scan" actionRoute="/scans/new" />
    } @else {
      <div class="pf-card mb-3 d-flex gap-2 flex-wrap align-items-end">
        <label class="small">Baseline
          <select class="form-select" [(ngModel)]="baselineId">
            @for (item of items(); track item.scanResultId) {
              <option [ngValue]="item.scanResultId">#{{ item.scanResultId }} {{ item.projectName }}</option>
            }
          </select>
        </label>
        <label class="small">Current
          <select class="form-select" [(ngModel)]="currentId">
            @for (item of items(); track item.scanResultId) {
              <option [ngValue]="item.scanResultId">#{{ item.scanResultId }} {{ item.projectName }}</option>
            }
          </select>
        </label>
        <button class="btn btn-primary btn-sm" type="button" (click)="compare()">Compare</button>
      </div>

      @if (comparison()) {
        <div class="pf-card mb-3">
          <h2 class="h6">Score {{ comparison()!.baselineScore }} → {{ comparison()!.currentScore }} ({{ comparison()!.scoreChange }})</h2>
          <p class="small mb-1">Introduced: {{ comparison()!.introduced.length }} · No longer present: {{ comparison()!.resolved.length }}</p>
          @for (issue of comparison()!.introduced.slice(0, 8); track issue.filePath + issue.title) {
            <div class="small">New · {{ issue.severity }} · {{ issue.title }} · {{ issue.filePath }}</div>
          }
        </div>
      }

      <div class="table-responsive pf-card">
        <table class="table align-middle mb-0">
          <thead>
            <tr><th>Project</th><th>When</th><th>Status</th><th>Findings</th><th>Score</th><th>Duration</th><th></th></tr>
          </thead>
          <tbody>
            @for (item of items(); track item.scanResultId) {
              <tr>
                <td>{{ item.projectName }}<div class="small text-muted">{{ item.sourceType }} {{ item.branch }}</div></td>
                <td>{{ item.createdAt | date:'medium' }}</td>
                <td>{{ item.status }}</td>
                <td>{{ item.issueCount }}</td>
                <td>{{ item.score }}</td>
                <td>{{ item.durationMs }} ms</td>
                <td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/scans', item.scanResultId]">Open</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class ScanHistoryComponent implements OnInit {
  private readonly scans = inject(ScanService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly items = signal<ScanHistoryItem[]>([]);
  readonly comparison = signal<ScanComparison | null>(null);
  baselineId = 0;
  currentId = 0;

  ngOnInit(): void {
    this.scans.getHistory().subscribe({
      next: (response) => {
        const rows = response.data?.items ?? [];
        this.items.set(rows);
        this.baselineId = rows[1]?.scanResultId ?? rows[0]?.scanResultId ?? 0;
        this.currentId = rows[0]?.scanResultId ?? 0;
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  compare(): void {
    if (!this.baselineId || !this.currentId || this.baselineId === this.currentId) {
      this.toast.warning('Choose two different scans.');
      return;
    }
    this.scans.compare(this.baselineId, this.currentId).subscribe({
      next: (response) => this.comparison.set(response.data)
    });
  }
}
