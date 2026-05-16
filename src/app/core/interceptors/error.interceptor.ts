import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
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

