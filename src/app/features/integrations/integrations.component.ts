import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';

interface Registration {
  id: number;
  owner: string;
  name: string;
  branch?: string;
  tokenPrefix: string;
  failOnNewCritical: boolean;
  warnOnHigh: boolean;
  allowAcceptedRisk: boolean;
  preventScoreRegression: boolean;
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Integrations"
      subtitle="Register a repository, download a workflow, and let GitHub Actions send a ZIP with a scan token. The token is shown once." />

    <form class="pf-card mb-3" [formGroup]="form" (ngSubmit)="register()">
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label" for="repo">GitHub repository URL</label>
          <input id="repo" class="form-control" formControlName="repositoryUrl" placeholder="https://github.com/owner/name" />
        </div>
        <div class="col-md-3">
          <label class="form-label" for="branch">Branch</label>
          <input id="branch" class="form-control" formControlName="branch" />
        </div>
        <div class="col-md-3 d-flex align-items-end">
          <button class="btn btn-primary w-100" type="submit" [disabled]="busy()">Register</button>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-3 mt-3 small">
        <label><input type="checkbox" formControlName="failOnNewCritical" /> Fail on new critical findings</label>
        <label><input type="checkbox" formControlName="warnOnHigh" /> Warn on new high findings</label>
        <label><input type="checkbox" formControlName="allowAcceptedRisk" /> Allow accepted risks</label>
        <label><input type="checkbox" formControlName="preventScoreRegression" /> Prevent score regression</label>
      </div>
    </form>

    @if (token()) {
      <div class="pf-card mb-3">
        <h2 class="h6">Scan token</h2>
        <p class="small">Save this as the GitHub secret PRODFALCON_TOKEN. ProdFalcon will not show it again.</p>
        <code>{{ token() }}</code>
        @if (workflow()) {
          <pre class="small mt-3 mb-0">{{ workflow() }}</pre>
        }
      </div>
    }

    <div class="pf-card">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="h6 mb-0">Registered repositories</h2>
        <button class="btn btn-sm btn-outline-secondary" type="button" (click)="downloadWorkflow()">Download workflow</button>
      </div>
      @for (item of registrations(); track item.id) {
        <p class="mb-1">{{ item.owner }}/{{ item.name }} · token {{ item.tokenPrefix }}… · fail on critical: {{ item.failOnNewCritical }}</p>
      } @empty {
        <p class="text-muted mb-0">No repository is registered yet.</p>
      }
    </div>
  `
})
export class IntegrationsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);

  readonly registrations = signal<Registration[]>([]);
  readonly token = signal('');
  readonly workflow = signal('');
  readonly busy = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    repositoryUrl: '',
    branch: '',
    failOnNewCritical: true,
    warnOnHigh: true,
    allowAcceptedRisk: true,
    preventScoreRegression: false
  });

  ngOnInit(): void {
    this.reload();
  }

  register(): void {
    this.busy.set(true);
    this.http.post<ApiResponse<{ token: string; workflow: string }>>(`${environment.apiUrl}/github/registrations`, this.form.getRawValue())
      .subscribe({
        next: (response) => {
          this.token.set(response.data?.token ?? '');
          this.workflow.set(response.data?.workflow ?? '');
          this.busy.set(false);
          this.reload();
        },
        error: () => this.busy.set(false)
      });
  }

  downloadWorkflow(): void {
    this.http.get(`${environment.apiUrl}/github/workflow`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'prodfalcon.yml';
        anchor.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  private reload(): void {
    this.http.get<ApiResponse<Registration[]>>(`${environment.apiUrl}/github/registrations`).subscribe({
      next: (response) => this.registrations.set(response.data ?? [])
    });
  }
}
