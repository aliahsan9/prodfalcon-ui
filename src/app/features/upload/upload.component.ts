import { HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval, switchMap, takeWhile } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ScanProgressComponent } from '../../shared/components/scan-progress/scan-progress.component';
import { ScanService } from '../../core/services/scan.service';
import { ToastService } from '../../core/services/toast.service';
import { validateGithubRepositoryUrl } from '../../core/utils/github-url';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, ScanProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="New scan"
      subtitle="Submit a public GitHub repository or a ZIP archive. The default run is a full project security audit." />

    <div class="row g-3">
      <div class="col-12 col-lg-6">
        <form class="pf-card h-100" [formGroup]="githubForm" (ngSubmit)="submitGitHub()">
          <h2 class="h6">GitHub repository</h2>
          <p class="small text-muted">Public repositories do not need a token. A token stays on this request and is not stored.</p>
          <label class="form-label" for="repo">Repository URL</label>
          <input id="repo" class="form-control mb-2" formControlName="repositoryUrl" placeholder="https://github.com/owner/repository" />
          @if (githubError()) { <p class="small text-danger">{{ githubError() }}</p> }
          <label class="form-label" for="branch">Branch</label>
          <input id="branch" class="form-control mb-2" formControlName="branch" placeholder="Default branch" />
          <label class="form-label" for="token">Personal access token</label>
          <input id="token" class="form-control mb-3" type="password" formControlName="accessToken" autocomplete="off" />
          <button class="btn btn-primary" type="submit" [disabled]="busy()">
            @if (busy()) {
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Scanning…
            } @else {
              Start GitHub scan
            }
          </button>
        </form>
      </div>

      <div class="col-12 col-lg-6">
        <div
          class="pf-card upload-zone h-100"
          [class.dragging]="dragging()"
          (dragover)="onDrag($event, true)"
          (dragleave)="onDrag($event, false)"
          (drop)="onDrop($event)">
          <h2 class="h6">ZIP upload</h2>
          <p class="small text-muted">Drag a project archive here. Archives are checked for traversal and size before scanning.</p>
          <input #fileInput class="d-none" type="file" accept=".zip,application/zip" (change)="onFile($event)" />
          <button class="btn btn-outline-primary" type="button" (click)="fileInput.click()" [disabled]="busy()">
            @if (busy() && uploadPercent() !== null) {
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Uploading…
            } @else {
              Choose ZIP
            }
          </button>
          @if (fileName()) { <p class="small mt-3 mb-0">{{ fileName() }}</p> }
          @if (uploadPercent() !== null) {
            <p class="small mt-2 mb-1">Upload {{ uploadPercent() }}%</p>
            <div class="progress"><div class="progress-bar" [style.width.%]="uploadPercent()"></div></div>
          }
        </div>
      </div>
    </div>

    @if (busy() && !finished()) {
      <div class="mt-3">
        <app-scan-progress
          [title]="stage() || 'Scanning project'"
          [stage]="stage() || 'Queued'"
          [message]="stageMessage() || 'Waiting for the scanner to pick up this project.'"
          [showCancel]="!!scanId()"
          (cancel)="cancel()" />
      </div>
    } @else if (stage()) {
      <div class="pf-card mt-3">
        <strong>{{ stage() }}</strong>
        <p class="small text-muted mb-0">{{ stageMessage() }}</p>
      </div>
    }
  `,
  styles: [`
    .upload-zone { border: 1px dashed var(--pf-border); }
    .upload-zone.dragging { border-color: var(--pf-primary); }
    .progress { height: 8px; }
  `]
})
export class UploadComponent implements OnDestroy {
  private readonly scans = inject(ScanService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);
  private poll?: Subscription;

  readonly busy = signal(false);
  readonly dragging = signal(false);
  readonly fileName = signal('');
  readonly uploadPercent = signal<number | null>(null);
  readonly stage = signal('');
  readonly stageMessage = signal('');
  readonly scanId = signal<number | null>(null);
  readonly finished = signal(false);
  readonly githubError = signal('');

  readonly githubForm = this.formBuilder.nonNullable.group({
    repositoryUrl: ['', Validators.required],
    branch: [''],
    accessToken: ['']
  });

  submitGitHub(): void {
    const value = this.githubForm.getRawValue();
    const error = validateGithubRepositoryUrl(value.repositoryUrl);
    this.githubError.set(error ?? '');
    if (error) return;

    this.busy.set(true);
    this.stage.set('Submitting');
    this.stageMessage.set('Creating the scan record.');
    this.scans.scanGitHub(value.repositoryUrl.trim(), value.branch.trim(), value.accessToken).subscribe({
      next: (response) => {
        if (!response.success) return;
        this.watch(response.data.scan.scanResultId);
      },
      error: () => {
        this.busy.set(false);
        this.stage.set('Failed');
        this.stageMessage.set('The repository could not be queued.');
      }
    });
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

  upload(file: File): void {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.toast.warning('Choose a .zip archive.');
      return;
    }
    if (file.size > 104_857_600) {
      this.toast.warning('ZIP files must be 100 MB or smaller.');
      return;
    }

    this.fileName.set(file.name);
    this.busy.set(true);
    this.uploadPercent.set(0);
    this.stage.set('Uploading');
    this.stageMessage.set('Sending the archive.');
    this.scans.uploadZip(file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadPercent.set(Math.round((event.loaded / event.total) * 100));
        }
        if (event.type === HttpEventType.Response && event.body?.success) {
          this.uploadPercent.set(100);
          this.watch(event.body.data.scan.scanResultId);
        }
      },
      error: () => {
        this.busy.set(false);
        this.stage.set('Failed');
        this.stageMessage.set('The archive was rejected.');
      }
    });
  }

  cancel(): void {
    const id = this.scanId();
    if (!id) return;
    this.scans.cancelScan(id).subscribe({
      next: () => {
        this.stage.set('Cancelled');
        this.stageMessage.set('Cancellation requested.');
        this.finished.set(true);
        this.busy.set(false);
        this.poll?.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  private watch(id: number): void {
    this.scanId.set(id);
    this.poll?.unsubscribe();
    this.poll = interval(1500).pipe(
      switchMap(() => this.scans.getScan(id)),
      takeWhile((response) => {
        const status = response.data?.status;
        return status === 'Queued' || status === 'Scanning';
      }, true)
    ).subscribe({
      next: (response) => {
        const scan = response.data;
        this.stage.set(scan.stage || scan.status);
        this.stageMessage.set(scan.stageMessage || scan.status);
        if (scan.status === 'Completed') {
          this.finished.set(true);
          this.busy.set(false);
          this.toast.success('Scan completed');
          this.router.navigate(['/scans', id]);
        } else if (scan.status === 'Failed' || scan.status === 'Cancelled') {
          this.finished.set(true);
          this.busy.set(false);
        }
      }
    });
  }
}
