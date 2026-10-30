import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CadastroResponse, Plano } from '../../../core/models/models';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.scss'
})
export class CadastroComponent {
  nome = '';
  email = '';
  cpf = '';
  senha = '';
  plano: Plano = 'BASICO';

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly resultado = signal<CadastroResponse | null>(null);

  constructor(private readonly authService: AuthService) {}

  cadastrar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.authService.cadastrar({ nome: this.nome, email: this.email, cpf: this.cpf, senha: this.senha, plano: this.plano }).subscribe({
      next: (resposta) => {
        this.carregando.set(false);
        this.resultado.set(resposta);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível concluir o cadastro.');
      }
    });
  }
}
