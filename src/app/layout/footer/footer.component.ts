import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer text-center text-muted small py-3">
      ProdFalcon © {{ year }} — Code quality & security for modern teams
    </footer>
  `,
  styles: [`.footer { border-top: 1px solid var(--pf-border); }`]
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}

