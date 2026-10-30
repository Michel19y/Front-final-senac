import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RestricaoService } from '../../../core/services/restricao.service';
import { LimiteDiario, Restricao } from '../../../core/models/models';

@Component({
  selector: 'app-restricoes',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './restricoes.component.html',
  styleUrl: './restricoes.component.scss'
})
export class RestricoesComponent implements OnInit {
  contaFilhaId = 0;
  novoArtistaId: number | null = null;
  novoLimite: number | null = null;

  readonly restricoes = signal<Restricao[]>([]);
  readonly limite = signal<LimiteDiario | null>(null);
  readonly erro = signal<string | null>(null);

  readonly explicitoBloqueado = computed(() => this.restricoes().some((r) => r.tipo === 'EXPLICITO_GERAL'));
  readonly artistasBloqueados = computed(() => this.restricoes().filter((r) => r.tipo === 'ARTISTA'));

  private get responsavelId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly restricaoService: RestricaoService
  ) {}

  ngOnInit(): void {
    this.contaFilhaId = Number(this.route.snapshot.paramMap.get('contaFilhaId'));
    this.carregar();
    this.carregarLimite();
  }

  carregar(): void {
    this.restricaoService.listar(this.responsavelId, this.contaFilhaId).subscribe({
      next: (restricoes) => this.restricoes.set(restricoes),
      error: () => this.erro.set('Não foi possível carregar as restrições.')
    });
  }

  carregarLimite(): void {
    this.restricaoService.obterLimiteDiario(this.responsavelId, this.contaFilhaId).subscribe({
      next: (limite) => {
        this.limite.set(limite);
        this.novoLimite = limite.limiteDiario;
      },
      error: () => this.erro.set('Não foi possível carregar o limite diário.')
    });
  }

  bloquearArtista(): void {
    if (!this.novoArtistaId) {
      return;
    }

    this.restricaoService.bloquearArtista(this.responsavelId, this.contaFilhaId, this.novoArtistaId).subscribe({
      next: () => {
        this.novoArtistaId = null;
        this.carregar();
      },
      error: (erro) => this.erro.set(erro.error?.erro ?? 'Não foi possível bloquear o artista.')
    });
  }

  desbloquearArtista(restricao: Restricao): void {
    if (!restricao.artistaId) {
      return;
    }

    this.restricaoService.desbloquearArtista(this.responsavelId, this.contaFilhaId, restricao.artistaId).subscribe({
      next: () => this.carregar(),
      error: () => this.erro.set('Não foi possível desbloquear o artista.')
    });
  }

  alternarExplicito(): void {
    const acao = this.explicitoBloqueado()
      ? this.restricaoService.desbloquearExplicito(this.responsavelId, this.contaFilhaId)
      : this.restricaoService.bloquearExplicito(this.responsavelId, this.contaFilhaId);

    acao.subscribe({
      next: () => this.carregar(),
      error: () => this.erro.set('Não foi possível atualizar o bloqueio de conteúdo explícito.')
    });
  }

  salvarLimite(): void {
    this.restricaoService.definirLimiteDiario(this.responsavelId, this.contaFilhaId, this.novoLimite).subscribe({
      next: () => this.carregarLimite(),
      error: () => this.erro.set('Não foi possível atualizar o limite diário.')
    });
  }
}
