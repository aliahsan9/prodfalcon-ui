import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ScoreCardComponent } from '../../../shared/components/score-card/score-card.component';
import { ScanService } from '../../../core/services/scan.service';
import { ScanIssue, ScanResult } from '../../../core/models/scan.model';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [RouterLink, ScoreCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="skeleton" style="height: 200px;"></div>
    } @else if (scan()) {
      <div class="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h1 class="h3 mb-1">Scan #{{ scan()!.scanResultId }}</h1>
          <p class="text-muted small mb-0">{{ scan()!.projectPath }}</p>
        </div>
        <a [routerLink]="['/ai-suggestions']" [queryParams]="{ scanResultId: scan()!.scanResultId }" class="btn btn-primary btn-sm">
          AI suggestions
        </a>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-6 col-xl"><app-score-card label="Overall" [score]="scan()!.overallScore" /></div>
        <div class="col-md-6 col-xl"><app-score-card label="Security" [score]="scan()!.securityScore" icon="bi-shield-lock" /></div>
        <div class="col-md-6 col-xl"><app-score-card label="Maintainability" [score]="scan()!.maintainabilityScore" icon="bi-tools" /></div>
        <div class="col-md-6 col-xl"><app-score-card label="Performance" [score]="scan()!.performanceScore" icon="bi-lightning" /></div>
        <div class="col-md-6 col-xl"><app-score-card label="Production" [score]="scan()!.productionReadinessScore" icon="bi-rocket" /></div>
      </div>

      @for (cat of categories; track cat.key) {
        <div class="pf-card mb-3">
          <h2 class="h6 mb-3">{{ cat.label }} ({{ issuesByCategory(cat.key).length }})</h2>
          @for (issue of issuesByCategory(cat.key); track issue.title + issue.filePath) {
            <div class="issue-item border-bottom py-3">
              <div class="d-flex justify-content-between gap-2 flex-wrap">
                <strong>{{ issue.title }}</strong>
                <span class="badge badge-severity-{{ issue.severity.toLowerCase() }}">{{ issue.severity }}</span>
              </div>
              <p class="small text-muted mb-1">{{ issue.ruleName }} · {{ issue.filePath }}</p>
              <p class="small mb-0">{{ issue.description || 'Review and apply recommended fix.' }}</p>
            </div>
          } @empty {
            <p class="text-muted small mb-0">No issues in this category.</p>
          }
        </div>
      }
    }
  `
})
export class ScanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly scanService = inject(ScanService);

  readonly loading = signal(true);
  readonly scan = signal<ScanResult | null>(null);

  readonly categories = [
    { key: 'Security', label: 'Security' },
    { key: 'Performance', label: 'Performance' },
    { key: 'Maintainability', label: 'Architecture & Maintainability' },
    { key: 'Production', label: 'Production readiness' },
    { key: 'General', label: 'Code smells' }
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.scanService.getScan(id).subscribe({
      next: (r) => {
        if (r.success) this.scan.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  issuesByCategory(category: string): ScanIssue[] {
    const issues = this.scan()?.issues ?? [];
    if (category === 'General') {
      return issues.filter((i) => !['Security', 'Performance', 'Maintainability', 'Production'].includes(i.category));
    }
    return issues.filter((i) => i.category === category);
  }
}
