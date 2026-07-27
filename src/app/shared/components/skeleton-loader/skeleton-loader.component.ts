import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-grid" [style.--cols]="columns">
      @for (i of items; track i) {
        <div class="skeleton" [style.height.px]="height"></div>
      }
    </div>
  `,
  styles: [`
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
      gap: 1rem;
    }
    @media (max-width: 991px) {
      .skeleton-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 575px) {
      .skeleton-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() count = 4;
  @Input() height = 120;
  @Input() columns = 4;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
