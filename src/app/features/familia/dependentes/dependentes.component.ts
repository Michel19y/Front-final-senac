import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FamiliaService } from '../../../core/services/familia.service';
import { Dependente } from '../../../core/models/models';
import { ConfirmacaoComponent } from '../../../shared/confirmacao/confirmacao.component';

@Component({
  selector: 'app-dependentes',
  standalone: true,
  imports: [FormsModule, RouterLink, ConfirmacaoComponent],
  templateUrl: './dependentes.component.html',
  styleUrl: './dependentes.component.scss'
})
export class DependentesComponent implements OnInit {
  nome = '';
  email = '';
  senha = '';

  readonly dependentes = signal<Dependente[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly mostrarSenha = signal(false);

  /** Membro aguardando confirmação de remoção; null = diálogo fechado. */
  readonly aRemover = signal<Dependente | null>(null);

  private get responsavelId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(private readonly authService: AuthService, private readonly familiaService: FamiliaService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.familiaService.listarDependentes(this.responsavelId).subscribe({
      next: (dependentes) => {
        this.carregando.set(false);
        this.dependentes.set(dependentes);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar os membros da família.');
      }
    });
  }

  adicionar(): void {
    if (!this.nome.trim() || !this.email.trim() || !this.senha.trim() || this.salvando()) {
      return;
    }

    this.erro.set(null);
    this.salvando.set(true);

    this.familiaService.adicionarDependente(this.responsavelId, this.nome, this.email, this.senha).subscribe({
      next: () => {
        this.salvando.set(false);
        this.nome = '';
        this.email = '';
        this.senha = '';
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível adicionar o membro.');
      }
    });
  }

  /** Só abre o diálogo — a remoção de fato acontece em confirmarRemocao(). */
  remover(dependente: Dependente): void {
    this.aRemover.set(dependente);
  }

  cancelarRemocao(): void {
    this.aRemover.set(null);
  }

  confirmarRemocao(): void {
    const dependente = this.aRemover();
    if (!dependente) {
      return;
    }

    this.aRemover.set(null);
    this.erro.set(null);

    this.familiaService.removerDependente(this.responsavelId, dependente.id).subscribe({
      next: () => this.carregar(),
      error: (erro: HttpErrorResponse) => this.erro.set(erro.error?.erro ?? 'Não foi possível remover o membro.')
    });
  }
}
