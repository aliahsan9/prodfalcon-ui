import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pf-card text-center py-5 px-3 empty-state">
      <i class="bi {{ icon }} display-5 text-primary mb-3 d-block"></i>
      <h2 class="h5 mb-2">{{ title }}</h2>
      <p class="text-muted mb-3">{{ message }}</p>
      @if (actionLabel && actionRoute) {
        <a [routerLink]="actionRoute" class="btn btn-primary btn-sm">{{ actionLabel }}</a>
      }
    </div>
  `,
  styles: [`
    .empty-state { animation: fade-up 0.35s ease; }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'bi-inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = 'Get started by uploading a project ZIP.';
  @Input() actionLabel = '';
  @Input() actionRoute = '';
}
