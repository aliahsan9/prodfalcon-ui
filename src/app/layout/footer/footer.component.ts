import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer text-center text-muted small py-3 px-2">
      <span class="d-none d-sm-inline">ProdFalcon © {{ year }} — AI Software Quality Platform</span>
      <span class="d-sm-none">ProdFalcon © {{ year }}</span>
    </footer>
  `,
  styles: [`
    .footer {
      border-top: 0;
      opacity: 0.72;
      padding-top: 0.15rem;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    }
  `]
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
