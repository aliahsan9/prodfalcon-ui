import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-locked-feature',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="locked-overlay">
      <ng-content />
      @if (locked) {
        <div class="locked-mask">
          <i class="bi bi-lock-fill fs-3 mb-2"></i>
          <p class="mb-2">{{ message }}</p>
          <a routerLink="/billing" class="btn btn-sm btn-outline-light">Upgrade</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .locked-overlay { position: relative; }
    .locked-mask {
      position: absolute; inset: 0;
      backdrop-filter: blur(4px);
      background: rgba(11, 15, 23, 0.75);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      border-radius: 16px; text-align: center; padding: 1rem;
    }
  `]
})
export class LockedFeatureComponent {
  @Input() locked = true;
  @Input() message = 'Pro feature — upgrade to unlock';
}

