import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import { CommonModule } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <div
      class="auth-page d-flex align-items-center justify-content-center min-vh-100 p-3"
    >

      <div
        class="pf-card auth-card w-100"
        style="max-width: 420px;"
      >

        <h1 class="h3 mb-1 pf-gradient-text">
          Create account
        </h1>

        <p class="text-muted mb-4">
          Start scanning projects in minutes
        </p>

        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
        >

          <div class="mb-3">

            <label class="form-label">
              Full name
            </label>

            <input
              type="text"
              class="form-control"
              formControlName="fullName"
              placeholder="Enter your full name"
            />

          </div>

          <div class="mb-3">

            <label class="form-label">
              Email
            </label>

            <input
              type="email"
              class="form-control"
              formControlName="email"
              placeholder="Enter your email"
            />

          </div>

          <div class="mb-3">

            <label class="form-label">
              Password
            </label>

            <input
              type="password"
              class="form-control"
              formControlName="password"
              placeholder="Enter your password"
            />

          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            [disabled]="loading() || form.invalid"
          >
            {{ loading() ? 'Creating...' : 'Create account' }}
          </button>

        </form>

        <p class="mt-3 mb-0 text-center text-muted small">

          Already have an account?

          <a routerLink="/auth/login">
            Sign in
          </a>

        </p>

      </div>

    </div>
  `,

  styles: [`
    .auth-card {
      border-radius: 16px;
    }
  `]
})
export class RegisterComponent {

  private readonly fb = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  private readonly toast = inject(ToastService);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({

    fullName: [
      '',
      [
        Validators.required
      ]
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6)
      ]
    ]
  });

  submit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }

    this.loading.set(true);

    const payload = this.form.getRawValue();

    this.authService.register(payload).subscribe({

      next: () => {

        this.loading.set(false);

        this.toast.success('Account created successfully!');

        this.router.navigateByUrl('/dashboard');
      },

      error: (error) => {

        console.error('Registration failed:', error);

        this.loading.set(false);

        this.toast.error?.('Registration failed');
      }
    });
  }
}