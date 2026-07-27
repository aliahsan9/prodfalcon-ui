import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header d-flex justify-content-between align-items-start mb-3 mb-md-4 flex-wrap gap-2 gap-md-3 pf-fade-in">
      <div class="page-header-text min-w-0 flex-grow-1">
        <h1 class="h3 mb-1 pf-page-title">{{ title }}</h1>
        @if (subtitle) {
          <p class="text-muted mb-0 page-subtitle">{{ subtitle }}</p>
        }
      </div>
      @if (actionLabel && actionRoute) {
        <a [routerLink]="actionRoute" class="btn btn-primary btn-sm page-action">
          @if (actionIcon) { <i class="bi {{ actionIcon }} me-1"></i> }
          {{ actionLabel }}
        </a>
      }
    </div>
  `,
  styles: [`
    .page-subtitle {
      font-size: 0.9rem;
      line-height: 1.4;
    }
    @media (max-width: 575px) {
      .page-action {
        width: 100%;
      }
      .pf-page-title {
        font-size: 1.35rem !important;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() actionLabel = '';
  @Input() actionRoute = '';
  @Input() actionIcon = '';
}
