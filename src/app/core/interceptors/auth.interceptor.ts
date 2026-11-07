import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const headers: Record<string, string> = { 'X-Api-Version': '1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return next(req.clone({ setHeaders: headers }));
};

