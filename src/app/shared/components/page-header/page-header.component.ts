import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3 pf-fade-in">
      <div>
        <h1 class="h3 mb-1 pf-page-title">{{ title }}</h1>
        @if (subtitle) {
          <p class="text-muted mb-0">{{ subtitle }}</p>
        }
      </div>
      @if (actionLabel && actionRoute) {
        <a [routerLink]="actionRoute" class="btn btn-primary btn-sm">
          @if (actionIcon) { <i class="bi {{ actionIcon }} me-1"></i> }
          {{ actionLabel }}
        </a>
      }
    </div>
  `
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() actionLabel = '';
  @Input() actionRoute = '';
  @Input() actionIcon = '';
}
