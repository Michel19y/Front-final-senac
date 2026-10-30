import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginPrecisaConfigurar2fa } from '../../../core/models/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  senha = '';
  codigo2fa = '';

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly configuracao2fa = signal<LoginPrecisaConfigurar2fa | null>(null);

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  entrar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.authService.login({ email: this.email, senha: this.senha, codigo2fa: this.codigo2fa || undefined }).subscribe({
      next: (resposta) => {
        this.carregando.set(false);

        if (this.authService.ehSucesso(resposta)) {
          this.router.navigate(['/musicas']);
          return;
        }

        this.configuracao2fa.set(resposta as LoginPrecisaConfigurar2fa);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(this.mensagemDeErro(erro));
      }
    });
  }

  private mensagemDeErro(erro: HttpErrorResponse): string {
    if (erro.status === 401) {
      return 'E-mail, senha ou código de autenticação inválidos.';
    }

    if (erro.status === 423) {
      return erro.error?.detail ?? 'Conta bloqueada temporariamente.';
    }

    return 'Não foi possível entrar. Tente novamente.';
  }
}
