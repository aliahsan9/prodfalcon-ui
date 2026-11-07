import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ScanProgressComponent } from '../../shared/components/scan-progress/scan-progress.component';
import { ScanService } from '../../core/services/scan.service';
import { ArchitectureEdge, ArchitectureGraph, ArchitectureNode, ProjectIntelligence, ScanHistoryItem, ThreatModel } from '../../core/models/scan.model';

@Component({
  selector: 'app-architecture-explorer',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, ScanProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="threatMode() ? 'Threat modeling' : 'Architecture explorer'"
      [subtitle]="threatMode()
        ? 'STRIDE items are architectural risks or static findings. ExploitConfirmed stays false because no attack was run.'
        : 'Nodes and edges come from the selected scan. Uncertain relationships are drawn dashed.'" />

    <div class="pf-card mb-3">
      <label class="form-label" for="scan">Scan</label>
      <select id="scan" class="form-select" [(ngModel)]="scanId" (ngModelChange)="load()">
        @for (item of history(); track item.scanResultId) {
          <option [ngValue]="item.scanResultId">#{{ item.scanResultId }} {{ item.projectName }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <app-scan-progress title="Checking this project" stage="Loading" [message]="threatMode() ? 'Loading the threat model for the selected scan.' : 'Loading the architecture graph for the selected scan.'" />
    } @else if (error()) {
      <app-empty-state title="No graph for this scan" [message]="error()!" actionLabel="New scan" actionRoute="/scans/new" />
    } @else if (graph()) {
      <div class="row g-3">
        <div class="col-lg-8">
          <div class="pf-card">
            <div class="d-flex gap-2 flex-wrap mb-2">
              <input class="form-control" style="max-width: 240px" placeholder="Search components" [(ngModel)]="query" aria-label="Search components" />
              <select class="form-select" style="max-width: 180px" [(ngModel)]="typeFilter" aria-label="Component type">
                <option value="">All types</option>
                @for (type of types(); track type) { <option [value]="type">{{ type }}</option> }
              </select>
              <button class="btn btn-outline-secondary btn-sm" type="button" (click)="zoom.set(zoom() + 0.15)">Zoom in</button>
              <button class="btn btn-outline-secondary btn-sm" type="button" (click)="zoom.set(Math.max(0.4, zoom() - 0.15))">Zoom out</button>
            </div>
            <p class="small text-muted">{{ graph()!.note }}</p>
            <svg
              class="graph"
              viewBox="0 0 760 460"
              (pointerdown)="panStart($event)"
              (pointermove)="panMove($event)"
              (pointerup)="panning.set(false)"
              role="img"
              aria-label="Architecture graph">
              <g [attr.transform]="'translate(' + pan().x + ' ' + pan().y + ') scale(' + zoom() + ')'">
                @for (edge of visibleEdges(); track edge.source + edge.target + edge.label) {
                  <line
                    [attr.x1]="point(edge.source).x" [attr.y1]="point(edge.source).y"
                    [attr.x2]="point(edge.target).x" [attr.y2]="point(edge.target).y"
                    [attr.stroke-dasharray]="edge.kind === 'Detected' ? '0' : '5 4'"
                    stroke="#64748b" stroke-width="1.4" />
                }
                @for (node of visibleNodes(); track node.id) {
                  <g (click)="selected.set(node)" (keydown.enter)="selected.set(node)" tabindex="0" role="button" [attr.aria-label]="node.label">
                    <rect [attr.x]="point(node.id).x - 70" [attr.y]="point(node.id).y - 18" width="140" height="36" rx="8"
                      [attr.fill]="selected()?.id === node.id ? '#1d4ed8' : '#0f172a'" stroke="#334155" />
                    <text [attr.x]="point(node.id).x" [attr.y]="point(node.id).y + 4" text-anchor="middle" fill="#e2e8f0" font-size="11">{{ short(node.label) }}</text>
                  </g>
                }
              </g>
            </svg>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="pf-card">
            @if (selected(); as node) {
              <h2 class="h6">{{ node.label }}</h2>
              <p class="small text-muted mb-1">{{ node.type }} · {{ node.kind }}</p>
              <p>{{ node.description }}</p>
              @if (node.filePath) { <p class="small"><strong>File.</strong> {{ node.filePath }}</p> }
              @if (node.risks.length) { <p class="small"><strong>Risks.</strong> {{ node.risks.join(' ') }}</p> }
              <p class="small mb-0"><strong>Relationships.</strong></p>
              @for (edge of related(node.id); track edge.source + edge.target + edge.label) {
                <p class="small mb-1">{{ edge.kind }}: {{ edge.source }} → {{ edge.target }} ({{ edge.label }}). {{ edge.evidence }}</p>
              }
            } @else {
              <p class="text-muted mb-0">Select a component. Dashed lines were not confirmed from a source reference.</p>
            }
          </div>
          @if (profile()) {
            <div class="pf-card mt-3">
              <h2 class="h6">Project profile</h2>
              <p class="small">{{ profile()!.purpose }} <span class="text-muted">({{ profile()!.purposeKind }})</span></p>
              <p class="small mb-0">{{ profile()!.languages.join(', ') || 'No language count' }}</p>
            </div>
          }
          @if (threats()) {
            <div class="pf-card mt-3">
              <h2 class="h6">Threats</h2>
              <p class="small text-muted">{{ threats()!.note }}</p>
              @for (threat of threats()!.threats; track threat.id) {
                <article class="border-top py-2">
                  <strong>{{ threat.id }} {{ threat.stride }}</strong>
                  <p class="small mb-1">{{ threat.title }}</p>
                  <p class="small mb-1">{{ threat.classification }}. Likelihood: {{ threat.likelihood }}. Exploit confirmed: {{ threat.exploitConfirmed }}.</p>
                  <p class="small mb-1"><strong>Scenario.</strong> {{ threat.scenario }}</p>
                  <p class="small mb-1"><strong>Evidence.</strong> {{ threat.evidence }}</p>
                  <p class="small mb-0"><strong>Mitigation.</strong> {{ threat.mitigation }}</p>
                </article>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .graph { width: 100%; height: 460px; background: #0b1220; border-radius: 8px; touch-action: none; }
    text { pointer-events: none; }
  `]
})
export class ArchitectureExplorerComponent implements OnInit {
  private readonly scans = inject(ScanService);
  private readonly route = inject(ActivatedRoute);

  readonly history = signal<ScanHistoryItem[]>([]);
  readonly loading = signal(true);
  readonly graph = signal<ArchitectureGraph | null>(null);
  readonly profile = signal<ProjectIntelligence | null>(null);
  readonly threats = signal<ThreatModel | null>(null);
  readonly error = signal<string | null>(null);
  readonly selected = signal<ArchitectureNode | null>(null);
  readonly zoom = signal(1);
  readonly pan = signal({ x: 40, y: 30 });
  readonly panning = signal(false);
  readonly threatMode = signal(false);
  scanId = 0;
  query = '';
  typeFilter = '';
  readonly Math = Math;
  private pointer?: { x: number; y: number };

  types(): string[] {
    return [...new Set((this.graph()?.nodes ?? []).map((node) => node.type))];
  }

  visibleNodes(): ArchitectureNode[] {
    const query = this.query.trim().toLowerCase();
    return (this.graph()?.nodes ?? []).filter((node) =>
      (!this.typeFilter || node.type === this.typeFilter) &&
      (!query || node.label.toLowerCase().includes(query) || (node.filePath || '').toLowerCase().includes(query)));
  }

  visibleEdges(): ArchitectureEdge[] {
    const ids = new Set(this.visibleNodes().map((node) => node.id));
    return (this.graph()?.edges ?? []).filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }

  ngOnInit(): void {
    this.threatMode.set(this.route.snapshot.data['mode'] === 'threats');
    this.scans.getHistory().subscribe({
      next: (response) => {
        const items = response.data?.items ?? [];
        this.history.set(items);
        const requested = Number(this.route.snapshot.queryParamMap.get('scanId'));
        this.scanId = requested || items[0]?.scanResultId || 0;
        if (this.scanId) this.load();
        else {
          this.loading.set(false);
          this.error.set('Run a scan before opening the explorer.');
        }
      }
    });
  }

  load(): void {
    if (!this.scanId) return;
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(null);
    this.scans.getArchitecture(this.scanId).subscribe({
      next: (response) => {
        this.graph.set(response.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Project intelligence was not stored for this scan. Scans completed before this feature have no graph.');
      }
    });
    this.scans.getIntelligence(this.scanId).subscribe({
      next: (response) => this.profile.set(response.data ?? null),
      error: () => this.profile.set(null)
    });
    if (this.threatMode()) {
      this.scans.getThreats(this.scanId).subscribe({
        next: (response) => {
          this.threats.set(response.data ?? null);
          if (response.data?.diagram?.nodes?.length)
            this.graph.set(response.data.diagram);
        }
      });
    } else {
      this.threats.set(null);
    }
  }

  point(id: string): { x: number; y: number } {
    const nodes = this.visibleNodes();
    const index = Math.max(0, nodes.findIndex((node) => node.id === id));
    const columns = 3;
    return { x: 110 + (index % columns) * 220, y: 50 + Math.floor(index / columns) * 80 };
  }

  related(id: string): ArchitectureEdge[] {
    return (this.graph()?.edges ?? []).filter((edge) => edge.source === id || edge.target === id);
  }

  short(value: string): string {
    return value.length > 22 ? value.slice(0, 21) + '…' : value;
  }

  panStart(event: PointerEvent): void {
    this.panning.set(true);
    this.pointer = { x: event.clientX, y: event.clientY };
  }

  panMove(event: PointerEvent): void {
    if (!this.panning() || !this.pointer) return;
    this.pan.set({
      x: this.pan().x + event.clientX - this.pointer.x,
      y: this.pan().y + event.clientY - this.pointer.y
    });
    this.pointer = { x: event.clientX, y: event.clientY };
  }
}
