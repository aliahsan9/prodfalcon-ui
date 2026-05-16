import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div class="pf-card auth-card w-100" style="max-width: 420px;">
        <h1 class="h3 mb-1 pf-gradient-text">Welcome back</h1>
        <p class="text-muted mb-4">Sign in to your ProdFalcon workspace</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" formControlName="email" />
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" formControlName="password" />
          </div>
          <button class="btn btn-primary w-100" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
        <p class="mt-3 mb-0 text-center text-muted small">
          No account? <a routerLink="/auth/register">Create one</a>
        </p>
      </div>
    </div>
  `,
  styles: [`.auth-card { border-radius: 16px; }`]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.toast.success('Welcome back!');
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => this.loading.set(false)
    });
  }
}

