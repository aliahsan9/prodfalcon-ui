import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';

@Component({
  selector: 'app-scan-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scan-wait" role="status" aria-live="polite" aria-busy="true">
      <div class="scan-wait__spinner" aria-hidden="true"></div>
      <div class="scan-wait__copy">
        <div class="scan-wait__title">{{ title }}</div>
        <p class="scan-wait__message">{{ message }}</p>
        <div class="scan-wait__track" aria-hidden="true"><span></span></div>
        <div class="scan-wait__meta">{{ stage }} · {{ elapsedLabel() }}</div>
      </div>
      @if (showCancel) {
        <button class="btn btn-outline-danger btn-sm" type="button" (click)="cancel.emit()">Cancel</button>
      }
    </div>
  `,
  styles: [`
    .scan-wait {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.15rem;
      border: 1px solid var(--pf-border);
      border-radius: 16px;
      background: var(--pf-card);
      box-shadow: var(--pf-shadow);
    }
    .scan-wait__spinner {
      width: 42px;
      height: 42px;
      flex: 0 0 auto;
      border-radius: 50%;
      border: 3px solid rgba(37, 99, 235, 0.18);
      border-top-color: #2563eb;
      animation: scan-spin 0.8s linear infinite;
    }
    .scan-wait__copy { flex: 1; min-width: 0; }
    .scan-wait__title { font-weight: 700; }
    .scan-wait__message { margin: 0.2rem 0 0.55rem; color: var(--pf-muted, #64748b); font-size: 0.875rem; }
    .scan-wait__track {
      height: 6px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(37, 99, 235, 0.12);
    }
    .scan-wait__track span {
      display: block;
      height: 100%;
      width: 40%;
      border-radius: inherit;
      background: linear-gradient(90deg, #60a5fa, #2563eb);
      animation: scan-slide 1.2s ease-in-out infinite;
    }
    .scan-wait__meta { margin-top: 0.4rem; font-size: 0.75rem; color: var(--pf-muted, #64748b); }
    @keyframes scan-spin { to { transform: rotate(360deg); } }
    @keyframes scan-slide {
      0% { transform: translateX(-120%); }
      100% { transform: translateX(280%); }
    }
  `]
})
export class ScanProgressComponent implements OnDestroy {
  @Input() title = 'Scanning project';
  @Input() message = 'Checking the project. You can stay on this page.';
  @Input() stage = 'Working';
  @Input() showCancel = false;
  @Output() cancel = new EventEmitter<void>();

  private readonly startedAt = Date.now();
  private readonly elapsed = signal(0);
  private readonly timer = setInterval(() => {
    this.elapsed.set(Math.floor((Date.now() - this.startedAt) / 1000));
  }, 1000);

  elapsedLabel(): string {
    const total = this.elapsed();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
