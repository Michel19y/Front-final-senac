import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FamiliaService } from '../../../core/services/familia.service';
import { Dependente } from '../../../core/models/models';

@Component({
  selector: 'app-dependentes',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './dependentes.component.html',
  styleUrl: './dependentes.component.scss'
})
export class DependentesComponent implements OnInit {
  nome = '';
  email = '';
  senha = '';

  readonly dependentes = signal<Dependente[]>([]);
  readonly erro = signal<string | null>(null);

  private get responsavelId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(private readonly authService: AuthService, private readonly familiaService: FamiliaService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.familiaService.listarDependentes(this.responsavelId).subscribe({
      next: (dependentes) => this.dependentes.set(dependentes),
      error: () => this.erro.set('Não foi possível carregar os membros da família. Este recurso exige plano PREMIUM.')
    });
  }

  adicionar(): void {
    if (!this.nome.trim() || !this.email.trim() || !this.senha.trim()) {
      return;
    }

    this.familiaService.adicionarDependente(this.responsavelId, this.nome, this.email, this.senha).subscribe({
      next: () => {
        this.nome = '';
        this.email = '';
        this.senha = '';
        this.carregar();
      },
      error: (erro) => this.erro.set(erro.error?.erro ?? 'Não foi possível adicionar o membro.')
    });
  }

  remover(dependente: Dependente): void {
    this.familiaService.removerDependente(this.responsavelId, dependente.id).subscribe({
      next: () => this.carregar(),
      error: (erro) => this.erro.set(erro.error?.erro ?? 'Não foi possível remover o membro.')
    });
  }
}
