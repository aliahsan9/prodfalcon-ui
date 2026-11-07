import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const isAuthEndpoint = /\/auth\/(login|register)/i.test(req.url);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Login/register handle their own messages — avoid double toasts / logout loops.
      if (isAuthEndpoint) {
        return throwError(() => err);
      }

      if (err.status === 401) {
        toast.error('Session expired. Please sign in again.');
        auth.handleUnauthorized();
        return throwError(() => err);
      }

      if (err.status === 403) {
        toast.error(err.error?.message ?? 'You do not have access to that resource.');
        auth.handleForbidden();
        return throwError(() => err);
      }

      if (err.status === 0) {
        toast.error('Cannot reach the API. Make sure ProdFalcon.API is running on port 5014.');
        return throwError(() => err);
      }

      if (err.status === 429) {
        const retry = err.headers.get('Retry-After');
        toast.warning(retry
          ? `Too many requests. Try again in ${retry}s.`
          : 'Too many requests. Please wait a moment and try again.');
        return throwError(() => err);
      }

      const message =
        err.error?.message ??
        err.error?.title ??
        (typeof err.error === 'string' ? err.error : null) ??
        'Something went wrong. Please try again.';
      toast.error(message);
      return throwError(() => err);
    })
  );
};
