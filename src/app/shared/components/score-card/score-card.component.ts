import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-score-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pf-card score-card h-100"
      [class.pf-card-clickable]="clickable"
      [class.score-card--compact]="compact"
      (click)="onClick()"
      (keydown.enter)="onClick()"
      [attr.role]="clickable ? 'button' : null"
      [attr.tabindex]="clickable ? 0 : null">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <span class="text-muted small">{{ label }}</span>
        <i class="bi {{ icon }} text-primary"></i>
      </div>

      @if (variant === 'circular') {
        <div class="d-flex align-items-center gap-3">
          <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring-track" cx="40" cy="40" r="34" />
            <circle
              class="ring-value"
              cx="40" cy="40" r="34"
              [style.stroke]="strokeColor"
              [style.stroke-dasharray]="circumference"
              [style.stroke-dashoffset]="dashOffset" />
            <text x="40" y="44" text-anchor="middle" class="ring-text">{{ displayScore }}</text>
          </svg>
          <div>
            <div class="fw-semibold">{{ toneLabel }}</div>
            <div class="small text-muted">{{ hint || 'Click for details' }}</div>
          </div>
        </div>
      } @else {
        <div class="display-6 fw-bold mb-0 score-value">
          {{ displayScore }}<span class="fs-6 text-muted">/100</span>
        </div>
        <div class="progress mt-3" style="height: 6px;">
          <div class="progress-bar" [style.width.%]="clamped" [style.background]="barGradient"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .score-card { outline: none; min-width: 0; }
    .score-card:focus-visible { box-shadow: 0 0 0 2px var(--pf-primary); }
    .score-value { letter-spacing: -0.03em; font-size: clamp(1.5rem, 4vw, 2.5rem); }
    .ring { width: 72px; height: 72px; transform: rotate(-90deg); flex-shrink: 0; }
    .ring-track { fill: none; stroke: var(--pf-border); stroke-width: 7; }
    .ring-value {
      fill: none; stroke-width: 7; stroke-linecap: round;
      transition: stroke-dashoffset 0.9s ease;
    }
    .ring-text {
      transform: rotate(90deg);
      transform-origin: 40px 40px;
      fill: var(--pf-text);
      font-size: 16px;
      font-weight: 700;
    }
    .progress-bar { transition: width 0.8s ease; }
    @media (max-width: 575px) {
      .ring { width: 56px; height: 56px; }
      .score-card--compact .score-value { font-size: 1.35rem; }
    }
  `]
})
export class ScoreCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) score = 0;
  @Input() icon = 'bi-shield-check';
  @Input() variant: 'bar' | 'circular' = 'bar';
  @Input() clickable = false;
  @Input() compact = false;
  @Input() hint = '';
  @Input() metricKey = '';
  @Output() cardClick = new EventEmitter<string>();

  private readonly radius = 34;
  readonly circumference = 2 * Math.PI * this.radius;

  get clamped(): number {
    return Math.max(0, Math.min(100, Math.round(this.score)));
  }

  get displayScore(): number {
    return this.clamped;
  }

  get dashOffset(): number {
    return this.circumference - (this.clamped / 100) * this.circumference;
  }

  get strokeColor(): string {
    if (this.clamped >= 80) return '#22c55e';
    if (this.clamped >= 60) return '#f59e0b';
    return '#ef4444';
  }

  get barGradient(): string {
    return `linear-gradient(90deg, ${this.strokeColor}, #8b5cf6)`;
  }

  get toneLabel(): string {
    if (this.clamped >= 80) return 'Healthy';
    if (this.clamped >= 60) return 'Needs work';
    return 'At risk';
  }

  onClick(): void {
    if (this.clickable) {
      this.cardClick.emit(this.metricKey || this.label);
    }
  }
}
