import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-score-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pf-card score-card h-100">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <span class="text-muted small">{{ label }}</span>
        <i class="bi {{ icon }} text-primary"></i>
      </div>
      <div class="display-6 fw-bold mb-0">{{ score }}<span class="fs-6 text-muted">/100</span></div>
      <div class="progress mt-3" style="height: 6px;">
        <div class="progress-bar" [style.width.%]="score"></div>
      </div>
    </div>
  `,
  styles: [`
    .score-card .progress-bar {
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
    }
  `]
})
export class ScoreCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) score = 0;
  @Input() icon = 'bi-shield-check';
}

