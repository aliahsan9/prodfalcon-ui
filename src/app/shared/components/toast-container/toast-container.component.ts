import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast-item alert alert-{{ mapType(t.type) }} alert-dismissible shadow">
          {{ t.message }}
          <button type="button" class="btn-close" (click)="toast.dismiss(t.id)"></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1080;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
    }
    .toast-item { border-radius: 12px; margin: 0; }
  `]
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.toast.toasts();
      this.cdr.markForCheck();
    });
  }

  mapType(type: string): string {
    return type === 'error' ? 'danger' : type;
  }
}

