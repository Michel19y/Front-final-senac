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
      // 401: o servidor diz que a sessão não vale mais.
      // 403: o id do token não bate com o da requisição — só acontece
      // quando o usuário guardado e o token vêm de sessões diferentes,
      // o que também é sessão quebrada. Nos dois casos, deslogar é a
      // única saída; sem isso o app trava numa tela de erro sem botão.
      if (erro.status === 401 || erro.status === 403) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => erro);
    })
  );
};
