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
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { safeReturnUrl } from '../../../core/guards/auth.guard';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  registerParams(): Record<string, string> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl ? { returnUrl } : {};
  }

  showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  emailMessage(): string {
    return this.form.controls.email.hasError('email')
      ? 'Enter a valid email address.'
      : 'Email is required.';
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const payload = this.form.getRawValue();

    this.authService.login(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Welcome back!');
        this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.loading.set(false);

        const apiMessage = error?.error?.message as string | undefined;
        if (error?.status === 0) {
          this.toast.error('Cannot reach the API. Start ProdFalcon.API on port 5014.');
          return;
        }

        this.toast.error(
          apiMessage && apiMessage !== 'Unauthorized.'
            ? apiMessage
            : 'Invalid email or password.'
        );
      }
    });
  }
}
