import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { ToastService } from '../../core/services/toast.service';
import {
  GitHubConnection,
  GitHubRepository,
  PlatformService,
  PullRequestScan
} from '../../core/services/platform.service';

interface Registration {
  id: number;
  owner: string;
  name: string;
  branch?: string;
  tokenPrefix: string;
  failOnNewCritical: boolean;
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="GitHub"
      subtitle="Connect an account, scan a repository or pull request, then let GitHub Actions enforce the workspace quality gate."
      actionLabel="Quality gate"
      actionRoute="/policies"
      actionIcon="bi-sliders" />

    <ol class="steps">
      <li [class.done]="connection()?.connected"><span>1</span> Connect GitHub</li>
      <li><span>2</span> Scan a repository or pull request</li>
      <li><span>3</span> Add the Actions workflow</li>
    </ol>

    <section class="pf-card mb-3">
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h2 class="h6 mb-1">Account</h2>
          @if (connection()?.connected) {
            <p class="mb-1">Signed in to GitHub as <strong>{{ connection()!.login }}</strong>.</p>
            <p class="small text-muted mb-0">ProdFalcon stores the token encrypted and only uses it when you scan a repository you choose.</p>
          } @else {
            <p class="mb-1">Connect GitHub to list repositories you can access, including private ones.</p>
            <p class="small text-muted mb-0">
              @if (connection()?.oauthConfigured) {
                OAuth is configured for this server. You can also paste a fine-grained token with repository read access.
              } @else {
                OAuth app credentials are not set on this server. Paste a personal access token to try the flow, or add GitHub:ClientId and GitHub:ClientSecret.
              }
            </p>
          }
        </div>
        @if (connection()?.connected) {
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="disconnect()" [disabled]="!canScan()">Disconnect</button>
        }
      </div>

      @if (!connection()?.connected && canScan()) {
        <div class="d-flex flex-wrap gap-2 mt-3">
          <button class="btn btn-primary" type="button" (click)="startOAuth()" [disabled]="busy()">
            <i class="bi bi-github me-1"></i> Continue with GitHub
          </button>
          <button class="btn btn-outline-primary" type="button" (click)="showToken.set(!showToken())">Use a personal access token</button>
        </div>
        @if (showToken()) {
          <form class="row g-2 mt-2" [formGroup]="tokenForm" (ngSubmit)="connectToken()">
            <div class="col-md-8">
              <label class="form-label" for="token">Personal access token</label>
              <input id="token" class="form-control" type="password" formControlName="accessToken" autocomplete="off" placeholder="github_pat_..." />
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <button class="btn btn-primary w-100" type="submit" [disabled]="busy()">Save token</button>
            </div>
          </form>
        }
      } @else if (!canScan()) {
        <p class="small mt-3 mb-0">Your role can view integrations. A developer or admin needs to connect GitHub.</p>
      }
    </section>

    <section class="pf-card mb-3">
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
        <h2 class="h6 mb-0">Repositories</h2>
        <button class="btn btn-sm btn-outline-secondary" type="button" (click)="loadRepos()" [disabled]="!connection()?.connected || busy()">Refresh</button>
      </div>
      @if (connection()?.connected) {
        <input class="form-control form-control-sm mb-3" placeholder="Filter repositories" [value]="repoQuery()" (input)="repoQuery.set(text($event))" />
        @for (repo of filteredRepos(); track repo.owner + repo.name) {
          <div class="repo">
            <div class="min-w-0">
              <strong>{{ repo.owner }}/{{ repo.name }}</strong>
              <span class="badge text-bg-light ms-1">{{ repo.private ? 'Private' : 'Public' }}</span>
              @if (repo.language) { <span class="text-muted small ms-1">{{ repo.language }}</span> }
              @if (repo.description) { <p class="small text-muted mb-0 text-truncate">{{ repo.description }}</p> }
            </div>
            <button class="btn btn-sm btn-primary" type="button" (click)="scanRepo(repo)" [disabled]="busy() || !canScan()">Scan</button>
          </div>
        } @empty {
          <p class="text-muted mb-0">No repositories matched. Refresh after connecting an account that can read repositories.</p>
        }
      } @else {
        <p class="text-muted mb-0">Connect GitHub to scan a repository from this list. You can still upload a ZIP from New Scan.</p>
      }
    </section>

    <section class="pf-card mb-3">
      <h2 class="h6">Pull request scan</h2>
      <p class="small text-muted">ProdFalcon reads the pull request, scans the head branch, and shows whether the quality gate passed.</p>
      <form class="row g-2" [formGroup]="pullForm" (ngSubmit)="scanPull()">
        <div class="col-md-4">
          <label class="form-label" for="pr-owner">Owner</label>
          <input id="pr-owner" class="form-control" formControlName="owner" placeholder="octocat" />
        </div>
        <div class="col-md-4">
          <label class="form-label" for="pr-name">Repository</label>
          <input id="pr-name" class="form-control" formControlName="name" placeholder="hello-world" />
        </div>
        <div class="col-md-2">
          <label class="form-label" for="pr-number">Number</label>
          <input id="pr-number" class="form-control" type="number" min="1" formControlName="number" />
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <button class="btn btn-primary w-100" type="submit" [disabled]="busy() || !canScan()">Scan PR</button>
        </div>
      </form>
      <div class="mt-3">
        @for (pull of pulls(); track pull.id) {
          <div class="repo">
            <div>
              <a [routerLink]="pull.scanResultId ? ['/scans', pull.scanResultId] : null">{{ pull.owner }}/{{ pull.name }} #{{ pull.number }}</a>
              <p class="small mb-0">{{ pull.title }}</p>
              <p class="small text-muted mb-0">{{ pull.source }} · {{ pull.summary || pull.status }}</p>
            </div>
            <span class="badge" [class.text-bg-success]="pull.status === 'Passed'" [class.text-bg-danger]="pull.status === 'Failed'" [class.text-bg-secondary]="pull.status !== 'Passed' && pull.status !== 'Failed'">{{ pull.status }}</span>
          </div>
        } @empty {
          <p class="text-muted mb-0">Pull request scans from this page, webhooks, and GitHub Actions show up here.</p>
        }
      </div>
    </section>

    <section class="pf-card">
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
        <div>
          <h2 class="h6 mb-1">GitHub Actions</h2>
          <p class="small text-muted mb-0">Register the repository, save the one-time token as PRODFALCON_TOKEN, and commit the workflow. The check fails when the repository policy or the workspace quality gate fails.</p>
        </div>
        <button class="btn btn-sm btn-outline-secondary" type="button" (click)="downloadWorkflow()">Download workflow</button>
      </div>

      @if (canAdminister()) {
        <form class="row g-2" [formGroup]="registerForm" (ngSubmit)="register()">
          <div class="col-md-6">
            <label class="form-label" for="repo">Repository URL</label>
            <input id="repo" class="form-control" formControlName="repositoryUrl" placeholder="https://github.com/owner/name" />
          </div>
          <div class="col-md-3">
            <label class="form-label" for="branch">Branch</label>
            <input id="branch" class="form-control" formControlName="branch" placeholder="main" />
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button class="btn btn-primary w-100" type="submit" [disabled]="busy()">Create token</button>
          </div>
          <div class="col-12 d-flex flex-wrap gap-3 small">
            <label><input type="checkbox" formControlName="failOnNewCritical" /> Fail on new critical findings</label>
            <label><input type="checkbox" formControlName="warnOnHigh" /> Warn on new high findings</label>
            <label><input type="checkbox" formControlName="allowAcceptedRisk" /> Allow accepted risks</label>
            <label><input type="checkbox" formControlName="preventScoreRegression" /> Prevent score regression</label>
          </div>
        </form>
      } @else {
        <p class="small">An admin registers repositories for Actions. You can still scan from a connected account above.</p>
      }

      @if (token()) {
        <div class="token-box mt-3">
          <p class="small mb-1">Copy this token into the repository secret <strong>PRODFALCON_TOKEN</strong>. It is not shown again.</p>
          <div class="d-flex gap-2 align-items-center">
            <code class="flex-grow-1">{{ token() }}</code>
            <button class="btn btn-sm btn-outline-primary" type="button" (click)="copy(token())">Copy</button>
          </div>
        </div>
      }

      <div class="mt-3">
        @for (item of registrations(); track item.id) {
          <p class="mb-1">{{ item.owner }}/{{ item.name }} · token {{ item.tokenPrefix }}… · critical gate {{ item.failOnNewCritical ? 'on' : 'off' }}</p>
        } @empty {
          <p class="text-muted mb-0">No Actions repository is registered yet.</p>
        }
      </div>
    </section>
  `,
  styles: [`
    .steps { display: flex; flex-wrap: wrap; gap: 0.6rem; padding: 0; margin: 0 0 1rem; list-style: none; }
    .steps li { display: flex; align-items: center; gap: 0.45rem; color: var(--pf-text-muted); font-size: 0.85rem; }
    .steps span { width: 1.4rem; height: 1.4rem; border-radius: 50%; display: grid; place-items: center; background: var(--pf-card-hover); font-weight: 800; font-size: 0.75rem; }
    .steps li.done { color: var(--pf-text); }
    .steps li.done span { background: #2563eb; color: white; }
    .repo { display: flex; justify-content: space-between; gap: 0.8rem; align-items: center; padding: 0.7rem 0; border-top: 1px solid var(--pf-border); }
    .token-box { background: var(--pf-card-hover); border-radius: 12px; padding: 0.8rem; }
    code { overflow-wrap: anywhere; }
  `]
})
export class IntegrationsComponent implements OnInit {
  private readonly platform = inject(PlatformService);
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly connection = signal<GitHubConnection | null>(null);
  readonly repositories = signal<GitHubRepository[]>([]);
  readonly pulls = signal<PullRequestScan[]>([]);
  readonly registrations = signal<Registration[]>([]);
  readonly token = signal('');
  readonly busy = signal(false);
  readonly showToken = signal(false);
  readonly repoQuery = signal('');
  readonly canScan = signal(false);
  readonly canAdminister = signal(false);
  readonly filteredRepos = computed(() => {
    const query = this.repoQuery().trim().toLowerCase();
    const repos = this.repositories();
    if (!query) return repos;
    return repos.filter((repo) => `${repo.owner}/${repo.name} ${repo.description ?? ''}`.toLowerCase().includes(query));
  });

  readonly tokenForm = this.formBuilder.nonNullable.group({ accessToken: ['', Validators.required] });
  readonly pullForm = this.formBuilder.nonNullable.group({
    owner: ['', Validators.required],
    name: ['', Validators.required],
    number: [1, Validators.min(1)]
  });
  readonly registerForm = this.formBuilder.nonNullable.group({
    repositoryUrl: '',
    branch: '',
    failOnNewCritical: true,
    warnOnHigh: true,
    allowAcceptedRisk: true,
    preventScoreRegression: false
  });

  ngOnInit(): void {
    this.canScan.set(this.platform.canScan());
    this.canAdminister.set(this.platform.canAdminister());
    const flag = this.route.snapshot.queryParamMap.get('github');
    if (flag === 'connected') this.toast.success('GitHub account connected.');
    if (flag === 'denied') this.toast.warning('GitHub sign-in was cancelled.');
    if (flag === 'error') this.toast.error('GitHub sign-in did not finish. You can paste a personal access token instead.');
    this.loadConnection();
    this.loadPulls();
    this.loadRegistrations();
  }

  startOAuth(): void {
    this.busy.set(true);
    this.platform.startOAuth().subscribe({
      next: (response) => {
        this.busy.set(false);
        const url = response.data?.url;
        if (url) window.location.href = url;
      },
      error: (error) => {
        this.busy.set(false);
        this.showToken.set(true);
        this.toast.error(this.message(error, 'GitHub OAuth is not available on this server yet.'));
      }
    });
  }

  connectToken(): void {
    const accessToken = this.tokenForm.controls.accessToken.value.trim();
    if (!accessToken) return;
    this.busy.set(true);
    this.platform.connectToken(accessToken).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.connection.set(response.data);
        this.tokenForm.reset();
        this.toast.success(response.message || 'GitHub connected.');
        this.loadRepos();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(this.message(error, 'That token was not accepted.'));
      }
    });
  }

  disconnect(): void {
    if (!window.confirm('Disconnect GitHub for your user? Existing scan history stays.')) return;
    this.platform.disconnect().subscribe({
      next: () => {
        this.connection.set({ connected: false, oauthConfigured: this.connection()?.oauthConfigured ?? false });
        this.repositories.set([]);
        this.toast.success('GitHub disconnected.');
      },
      error: (error) => this.toast.error(this.message(error, 'GitHub could not be disconnected.'))
    });
  }

  loadRepos(): void {
    this.platform.repositories().subscribe({
      next: (response) => this.repositories.set(response.data ?? []),
      error: (error) => this.toast.error(this.message(error, 'Repositories could not be loaded.'))
    });
  }

  scanRepo(repo: GitHubRepository): void {
    this.busy.set(true);
    this.platform.scanRepository(repo.owner, repo.name, repo.defaultBranch).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.toast.success(`Scan queued for ${repo.owner}/${repo.name}.`);
        if (response.data?.scanResultId) this.router.navigate(['/scans', response.data.scanResultId]);
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(this.message(error, 'The repository scan could not be queued.'));
      }
    });
  }

  scanPull(): void {
    if (this.pullForm.invalid) return;
    const value = this.pullForm.getRawValue();
    this.busy.set(true);
    this.platform.scanPullRequest(value.owner.trim(), value.name.trim(), Number(value.number)).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Pull request scan queued.');
        this.loadPulls();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(this.message(error, 'The pull request could not be scanned.'));
      }
    });
  }

  register(): void {
    this.busy.set(true);
    this.http.post<ApiResponse<{ token: string }>>(`${environment.apiUrl}/github/registrations`, this.registerForm.getRawValue()).subscribe({
      next: (response) => {
        this.token.set(response.data?.token ?? '');
        this.busy.set(false);
        this.toast.success('Copy the token into GitHub before you leave this page.');
        this.loadRegistrations();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(this.message(error, 'The repository could not be registered.'));
      }
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

  copy(value: string): void {
    navigator.clipboard.writeText(value).then(
      () => this.toast.success('Token copied.'),
      () => this.toast.warning('Select the token and copy it manually.')
    );
  }

  text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private loadConnection(): void {
    this.platform.connection().subscribe({
      next: (response) => {
        this.connection.set(response.data);
        if (response.data?.connected) this.loadRepos();
      }
    });
  }

  private loadPulls(): void {
    this.platform.pullRequests().subscribe({
      next: (response) => this.pulls.set(response.data ?? [])
    });
  }

  private loadRegistrations(): void {
    this.http.get<ApiResponse<Registration[]>>(`${environment.apiUrl}/github/registrations`).subscribe({
      next: (response) => this.registrations.set(response.data ?? [])
    });
  }

  private message(error: unknown, fallback: string): string {
    const body = (error as { error?: { message?: string } })?.error;
    return body?.message || fallback;
  }
}
