import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ScanService } from '../../core/services/scan.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1">Upload project</h1>
    <p class="text-muted mb-4">Drag & drop a ZIP archive to scan your codebase</p>

    <div class="pf-card upload-zone"
         [class.dragging]="dragging()"
         (dragover)="onDrag($event, true)"
         (dragleave)="onDrag($event, false)"
         (drop)="onDrop($event)">
      <i class="bi bi-cloud-arrow-up display-4 text-primary mb-3"></i>
      <p class="mb-2">Drop your ZIP here or browse</p>
      <input #fileInput type="file" accept=".zip" class="d-none" (change)="onFile($event)" />
      <button class="btn btn-primary" (click)="fileInput.click()" [disabled]="uploading()">Select ZIP</button>
      @if (fileName()) { <p class="small text-muted mt-3 mb-0">{{ fileName() }}</p> }
    </div>

    @if (uploading()) {
      <div class="mt-3">
        <div class="progress" style="height: 8px;">
          <div class="progress-bar progress-bar-striped progress-bar-animated" [style.width.%]="progress()"></div>
        </div>
        <p class="small text-muted mt-2 mb-0">Scanning project...</p>
      </div>
    }
  `,
  styles: [`
    .upload-zone {
      border: 2px dashed var(--pf-border);
      border-radius: 16px;
      padding: 3rem 1rem;
      text-align: center;
      transition: border-color .2s, background .2s;
    }
    .upload-zone.dragging { border-color: #8b5cf6; background: rgba(99,102,241,.08); }
  `]
})
export class UploadComponent {
  private readonly scanService = inject(ScanService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly fileName = signal('');
  readonly dragging = signal(false);

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

  upload(file: File): void {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.toast.warning('Only ZIP files are supported.');
      return;
    }
    this.fileName.set(file.name);
    this.uploading.set(true);
    this.progress.set(30);
    this.scanService.uploadZip(file).subscribe({
      next: (res) => {
        this.progress.set(100);
        this.uploading.set(false);
        if (res.success) {
          this.toast.success(res.message);
          this.router.navigate(['/scans', res.data.scan.scanResultId]);
        }
      },
      error: () => {
        this.uploading.set(false);
        this.progress.set(0);
      }
    });
  }
}
