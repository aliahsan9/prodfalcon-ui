import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { safeReturnUrl } from '../../../core/guards/auth.guard';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly strength = signal(0);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    organizationName: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordsMatch });

  constructor() {
    this.form.controls.password.valueChanges.pipe(
      startWith(this.form.controls.password.value),
      takeUntilDestroyed()
    ).subscribe((value) => this.strength.set(this.score(value)));
  }

  loginParams(): Record<string, string> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl ? { returnUrl } : {};
  }

  showError(name: 'fullName' | 'email' | 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  mismatch(): boolean {
    const confirm = this.form.controls.confirmPassword;
    return this.form.hasError('passwordMismatch') && (confirm.touched || this.submitted());
  }

  emailMessage(): string {
    return this.form.controls.email.hasError('email')
      ? 'Enter a valid email address.'
      : 'Email is required.';
  }

  passwordMessage(): string {
    return this.form.controls.password.hasError('minlength')
      ? 'Use at least 6 characters.'
      : 'Password is required.';
  }

  strengthLabel(): string {
    return ['', 'Weak', 'Okay', 'Good', 'Strong'][this.strength()] ?? '';
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const raw = this.form.getRawValue();
    const organizationName = raw.organizationName.trim();

    this.authService.register({
      fullName: raw.fullName.trim(),
      email: raw.email.trim(),
      password: raw.password,
      organizationName: organizationName || undefined
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Account created successfully!');
        this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
      error: (error) => {
        console.error('Registration failed:', error);
        this.loading.set(false);
        const apiMessage = error?.error?.message as string | undefined;
        this.toast.error(apiMessage || 'Registration failed');
      }
    });
  }

  private score(value: string): number {
    if (!value) {
      return 0;
    }
    if (value.length < 6) {
      return 1;
    }
    let score = 1;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }
}
