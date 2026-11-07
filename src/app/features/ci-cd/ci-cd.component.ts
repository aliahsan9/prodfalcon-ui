import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ci-cd',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="h3 mb-1 pf-page-title">CI/CD</h1>
    <p class="text-muted">GitHub checks are configured on the integrations page. ProdFalcon does not connect a GitHub App from this screen.</p>
    <a class="btn btn-primary" routerLink="/integrations">Open integrations</a>
  `
})
export class CiCdComponent {}
