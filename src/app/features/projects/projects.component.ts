import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { ProjectSummary } from '../../core/models/scan.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <div>
        <h1 class="h3 mb-1">Projects</h1>
        <p class="text-muted mb-0">All scanned repositories and ZIP uploads</p>
      </div>
      <a routerLink="/upload" class="btn btn-primary btn-sm">+ New scan</a>
    </div>

    <div class="pf-card mb-3">
      <input class="form-control" placeholder="Search projects..." [(ngModel)]="query" (ngModelChange)="filter()" />
    </div>

    <div class="row g-3">
      @for (p of filtered(); track p.projectId) {
        <div class="col-md-6 col-xl-4">
          <div class="pf-card project-card h-100">
            <div class="d-flex justify-content-between mb-2">
              <h2 class="h6 mb-0 text-truncate">{{ p.fileName }}</h2>
              <span class="badge" [class]="healthClass(p)">{{ health(p) }}</span>
            </div>
            <p class="small text-muted mb-2">Last scan: {{ p.uploadedAt | date:'medium' }}</p>
            <div class="d-flex justify-content-between small">
              <span>Risk: <strong>{{ p.latestScore }}/100</strong></span>
              <span>{{ p.issueCount }} issues</span>
            </div>
            <div class="mt-3">
              @if (p.latestScanResultId) {
                <a [routerLink]="['/scans', p.latestScanResultId]" class="btn btn-outline-primary btn-sm">View scan</a>
              }
            </div>
          </div>
        </div>
      } @empty {
        <div class="col-12">
          <div class="pf-card text-center text-muted py-5">No projects yet. Upload a ZIP to get started.</div>
        </div>
      }
    </div>
  `,
  styles: [`.project-card { transition: transform .2s; } .project-card:hover { transform: translateY(-2px); }`]
})
export class ProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly filtered = signal<ProjectSummary[]>([]);
  query = '';

  ngOnInit(): void {
    this.projectService.getProjects().subscribe({
      next: (r) => {
        if (r.success) {
          this.projects.set(r.data);
          this.filtered.set(r.data);
        }
      }
    });
  }

  filter(): void {
    const q = this.query.toLowerCase();
    this.filtered.set(this.projects().filter((p) => p.fileName.toLowerCase().includes(q)));
  }

  health(p: ProjectSummary): string {
    return this.projectService.getHealth(p.latestScore, p.issueCount);
  }

  healthClass(p: ProjectSummary): string {
    const h = this.health(p);
    return h === 'Healthy' ? 'text-bg-success' : h === 'Warning' ? 'text-bg-warning' : 'text-bg-danger';
  }
}

