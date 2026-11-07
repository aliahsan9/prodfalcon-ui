import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.scss'
})
export class PublicFooterComponent {
  readonly year = new Date().getFullYear();
}
