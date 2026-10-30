import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.obterToken();

  if (!token) {
    return next(req);
  }

  const autenticada = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(autenticada).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => erro);
    })
  );
};
