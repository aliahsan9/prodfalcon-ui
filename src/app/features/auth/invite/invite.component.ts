import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlatformService } from '../../../core/services/platform.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="invite">
      <div class="pf-card">
        <p class="kicker">Workspace invite</p>
        <h1>Join this ProdFalcon workspace</h1>
        <p class="text-muted">Set a password to accept the invite. You will land on the dashboard with the role your admin chose.</p>
        @if (!token()) {
          <p>This invite link is missing a token. Ask the workspace admin to send a new one.</p>
          <a routerLink="/auth/login">Back to sign in</a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="accept()">
            <label class="form-label" for="name">Your name</label>
            <input id="name" class="form-control mb-3" formControlName="fullName" />
            <label class="form-label" for="password">Password</label>
            <input id="password" class="form-control mb-3" type="password" formControlName="password" />
            <button class="btn btn-primary w-100" type="submit" [disabled]="busy()">Accept invite</button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    .invite { min-height: 60vh; display: grid; place-items: center; padding: 2rem 1rem; }
    .pf-card { width: min(440px, 100%); }
    h1 { font-size: 1.6rem; margin-bottom: 0.4rem; }
    .kicker { color: #2563eb; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.75rem; }
  `]
})
export class InviteComponent implements OnInit {
  private readonly platform = inject(PlatformService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  readonly token = signal('');
  readonly busy = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  accept(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.platform.acceptInvite(this.token(), value.password, value.fullName.trim()).subscribe({
      next: (response) => {
        this.busy.set(false);
        const session = response.data;
        if (!session?.token) {
          this.toast.error('The invite was accepted, but sign-in did not start. Try the login page.');
          return;
        }
        this.auth.startSession(session);
        this.toast.success('Welcome to the workspace.');
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.busy.set(false);
        const body = (error as { error?: { message?: string } })?.error;
        this.toast.error(body?.message || 'This invite could not be accepted.');
      }
    });
  }
}
