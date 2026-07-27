import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ScanService } from '../../core/services/scan.service';
import { ToastService } from '../../core/services/toast.service';
import { LoggerService } from '../../core/services/logger.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface UploadSource {
  id: string;
  label: string;
  icon: string;
  available: boolean;
  hint: string;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Upload & scan"
      subtitle="Drop a ZIP now — GitHub, GitLab, Azure DevOps, and more connect in upcoming phases" />

    <div class="row g-3 mb-4">
      @for (src of sources; track src.id) {
        <div class="col-6 col-md-4 col-xl-3">
          <button
            type="button"
            class="pf-card source-card w-100 text-start"
            [class.active]="selectedSource() === src.id"
            [disabled]="!src.available || uploading()"
            (click)="selectSource(src)">
            <i class="bi {{ src.icon }} fs-4 text-primary d-block mb-2"></i>
            <div class="fw-semibold">{{ src.label }}</div>
            <div class="small text-muted">{{ src.hint }}</div>
          </button>
        </div>
      }
    </div>

    <div
      class="pf-card upload-zone"
      [class.dragging]="dragging()"
      (dragover)="onDrag($event, true)"
      (dragleave)="onDrag($event, false)"
      (drop)="onDrop($event)">
      <i class="bi bi-cloud-arrow-up display-4 text-primary mb-3"></i>
      <p class="mb-1 fw-semibold">Drop your ZIP here or browse</p>
      <p class="small text-muted mb-3">Max 500MB · Automatic extract · Background scan</p>
      <input #fileInput type="file" accept=".zip" class="d-none" (change)="onFile($event)" />
      <div class="d-flex justify-content-center gap-2 flex-wrap">
        <button class="btn btn-primary" (click)="fileInput.click()" [disabled]="uploading()">
          <i class="bi bi-folder2-open me-1"></i> Select ZIP
        </button>
        @if (uploading()) {
          <button class="btn btn-outline-danger" type="button" (click)="cancelUpload()">Cancel</button>
        }
      </div>
      @if (fileName()) {
        <p class="small text-muted mt-3 mb-0"><i class="bi bi-file-earmark-zip me-1"></i>{{ fileName() }}</p>
      }
    </div>

    @if (uploading()) {
      <div class="pf-card mt-3">
        <div class="d-flex justify-content-between small mb-2">
          <span>{{ statusText() }}</span>
          <span>{{ progress() }}%</span>
        </div>
        <div class="progress" style="height: 10px;">
          <div class="progress-bar progress-bar-striped progress-bar-animated" [style.width.%]="progress()"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .upload-zone {
      border: 2px dashed var(--pf-border);
      border-radius: 16px;
      padding: 2rem 1rem;
      text-align: center;
      transition: border-color .2s, background .2s;
    }
    .upload-zone.dragging { border-color: #8b5cf6; background: rgba(99,102,241,.08); }
    .source-card {
      cursor: pointer;
      min-height: 100px;
    }
    .source-card:disabled { opacity: 0.55; cursor: not-allowed; }
    .source-card.active { border-color: var(--pf-primary); box-shadow: 0 0 0 1px var(--pf-primary); }
    @media (min-width: 768px) {
      .upload-zone { padding: 3rem 1.5rem; }
      .source-card { min-height: 120px; }
    }
    @media (max-width: 575px) {
      .source-card {
        min-height: 90px;
        padding: 0.85rem !important;
      }
      .source-card .fs-4 { font-size: 1.25rem !important; }
    }
  `]
})
export class UploadComponent {
  private readonly scanService = inject(ScanService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly fileName = signal('');
  readonly dragging = signal(false);
  readonly selectedSource = signal('zip');
  readonly statusText = signal('Preparing upload...');

  private progressTimer?: ReturnType<typeof setInterval>;
  private cancelled = false;

  readonly sources: UploadSource[] = [
    { id: 'zip', label: 'ZIP archive', icon: 'bi-file-earmark-zip', available: true, hint: 'Ready now' },
    { id: 'github', label: 'GitHub', icon: 'bi-github', available: false, hint: 'Phase 2' },
    { id: 'gitlab', label: 'GitLab', icon: 'bi-git', available: false, hint: 'Phase 2' },
    { id: 'azure', label: 'Azure DevOps', icon: 'bi-microsoft', available: false, hint: 'Phase 2' },
    { id: 'bitbucket', label: 'Bitbucket', icon: 'bi-box', available: false, hint: 'Phase 2' },
    { id: 'folder', label: 'Local folder', icon: 'bi-folder', available: false, hint: 'Phase 3' },
    { id: 'docker', label: 'Docker image', icon: 'bi-box-seam', available: false, hint: 'Phase 3' },
    { id: 'api', label: 'API upload', icon: 'bi-hdd-network', available: false, hint: 'Phase 2' }
  ];

  selectSource(src: UploadSource): void {
    if (!src.available) {
      this.toast.info('This source is coming soon');
      return;
    }
    this.selectedSource.set(src.id);
  }

  onDrag(event: DragEvent, active: boolean): void {
    event.preventDefault();
    this.dragging.set(active);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.upload(file);
  }

  cancelUpload(): void {
    this.cancelled = true;
    this.clearProgress();
    this.uploading.set(false);
    this.progress.set(0);
    this.statusText.set('Cancelled');
    this.toast.warning('Upload cancelled');
    this.logger.warn('Upload cancelled by user');
  }

  upload(file: File): void {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.toast.warning('Only ZIP files are supported in Phase 1.');
      return;
    }

    this.cancelled = false;
    this.fileName.set(file.name);
    this.uploading.set(true);
    this.progress.set(12);
    this.statusText.set('Uploading archive...');
    this.logger.info('Starting ZIP upload', { name: file.name, size: file.size });

    this.progressTimer = setInterval(() => {
      const next = Math.min(88, this.progress() + 7);
      this.progress.set(next);
      if (next > 40) this.statusText.set('Extracting & scanning...');
    }, 400);

    this.scanService.uploadZip(file).subscribe({
      next: (res) => {
        this.clearProgress();
        if (this.cancelled) return;
        this.progress.set(100);
        this.uploading.set(false);
        this.statusText.set('Complete');
        if (res.success) {
          this.toast.success(res.message || 'Scan completed');
          this.logger.info('Upload scan completed', { scanId: res.data.scan.scanResultId });
          this.router.navigate(['/scans', res.data.scan.scanResultId]);
        }
      },
      error: (err) => {
        this.clearProgress();
        this.uploading.set(false);
        this.progress.set(0);
        this.statusText.set('Failed');
        this.logger.error('Upload failed', err);
      }
    });
  }

  private clearProgress(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
  }
}
