import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MusicaService } from '../../../core/services/musica.service';
import { RestricaoService } from '../../../core/services/restricao.service';
import { ArtistaBusca, LimiteDiario, Restricao } from '../../../core/models/models';

/** Espera o dedo parar antes de ir ao servidor a cada tecla. */
const ESPERA_BUSCA = 300;

@Component({
  selector: 'app-restricoes',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './restricoes.component.html',
  styleUrl: './restricoes.component.scss'
})
export class RestricoesComponent implements OnInit {
  contaFilhaId = 0;
  novoLimite: number | null = null;

  readonly termoArtista = signal('');
  /** Quantas faixas do catálogo estão marcadas como explícitas. */
  readonly explicitasNoCatalogo = signal(0);

  private relogioBusca?: ReturnType<typeof setTimeout>;

  readonly restricoes = signal<Restricao[]>([]);
  readonly limite = signal<LimiteDiario | null>(null);
  readonly resultadosArtistas = signal<ArtistaBusca[]>([]);

  readonly carregando = signal(false);
  readonly buscandoArtistas = signal(false);
  readonly salvandoExplicito = signal(false);
  readonly salvandoLimite = signal(false);
  readonly bloqueandoArtistaId = signal<number | null>(null);
  readonly desbloqueandoArtistaId = signal<number | null>(null);

  readonly erro = signal<string | null>(null);

  readonly explicitoBloqueado = computed(() => this.restricoes().some((r) => r.tipo === 'EXPLICITO_GERAL'));
  readonly artistasBloqueados = computed(() => this.restricoes().filter((r) => r.tipo === 'ARTISTA'));

  private get responsavelId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly musicaService: MusicaService,
    private readonly restricaoService: RestricaoService
  ) {
    effect(() => {
      const termo = this.termoArtista().trim();
      clearTimeout(this.relogioBusca);

      // Uma letra casa com meio catálogo e não ajuda ninguém.
      if (termo.length < 2) {
        this.resultadosArtistas.set([]);
        this.buscandoArtistas.set(false);
        return;
      }
      this.relogioBusca = setTimeout(() => this.buscarArtistas(termo), ESPERA_BUSCA);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.contaFilhaId = Number(params.get('contaFilhaId'));
      this.carregar();
      this.carregarLimite();
    });

    // Para dizer quantas faixas a chave de explícito realmente corta.
    this.musicaService.listar(this.responsavelId).subscribe({
      next: (m) => this.explicitasNoCatalogo.set(m.filter((f) => f.explicito).length),
      error: () => this.explicitasNoCatalogo.set(0)
    });
  }

  /** Letra no lugar da capa: artista não tem arte no catálogo. */
  inicialDe(nome: string): string {
    return (nome || '?').trim().charAt(0).toUpperCase();
  }

  jaBloqueado(artistaId: number): boolean {
    return this.artistasBloqueados().some((r) => r.artistaId === artistaId);
  }

  /**
   * `silencioso` relê sem apagar a tela.
   *
   * Depois de cortar ou liberar um artista, piscar "Carregando restrições..."
   * derrubava a busca inteira junto — você perdia a lista de resultados por
   * causa de uma atualização que já tinha o dado na mão.
   */
  carregar(silencioso = false): void {
    this.erro.set(null);
    if (!silencioso) {
      this.carregando.set(true);
    }

    this.restricaoService.listar(this.responsavelId, this.contaFilhaId).subscribe({
      next: (restricoes) => {
        this.carregando.set(false);
        this.restricoes.set(restricoes);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar as restrições.');
      }
    });
  }

  carregarLimite(): void {
    this.restricaoService.obterLimiteDiario(this.responsavelId, this.contaFilhaId).subscribe({
      next: (limite) => {
        this.limite.set(limite);
        this.novoLimite = limite.limiteDiario;
      },
      error: (erro: HttpErrorResponse) => this.erro.set(erro.error?.erro ?? 'Não foi possível carregar o limite diário.')
    });
  }

  private buscarArtistas(termo: string): void {
    this.erro.set(null);
    this.buscandoArtistas.set(true);

    this.restricaoService.buscarArtistas(termo).subscribe({
      next: (artistas) => {
        this.buscandoArtistas.set(false);
        this.resultadosArtistas.set(artistas);
      },
      error: (erro: HttpErrorResponse) => {
        this.buscandoArtistas.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível buscar artistas.');
      }
    });
  }

  bloquearArtista(artista: ArtistaBusca): void {
    if (this.bloqueandoArtistaId() !== null) {
      return;
    }

    this.erro.set(null);
    this.bloqueandoArtistaId.set(artista.id);

    this.restricaoService.bloquearArtista(this.responsavelId, this.contaFilhaId, artista.id).subscribe({
      next: () => {
        this.bloqueandoArtistaId.set(null);
        // A busca fica como está: cortar um artista costuma vir em série,
        // e limpar o campo obrigaria a digitar tudo de novo.
        this.carregar(true);
      },
      error: (erro: HttpErrorResponse) => {
        this.bloqueandoArtistaId.set(null);
        this.erro.set(erro.error?.erro ?? 'Não foi possível bloquear o artista.');
      }
    });
  }

  desbloquearArtista(restricao: Restricao): void {
    if (!restricao.artistaId || this.desbloqueandoArtistaId() !== null) {
      return;
    }

    this.erro.set(null);
    this.desbloqueandoArtistaId.set(restricao.artistaId);

    this.restricaoService.desbloquearArtista(this.responsavelId, this.contaFilhaId, restricao.artistaId).subscribe({
      next: () => {
        this.desbloqueandoArtistaId.set(null);
        this.carregar(true);
      },
      error: (erro: HttpErrorResponse) => {
        this.desbloqueandoArtistaId.set(null);
        this.erro.set(erro.error?.erro ?? 'Não foi possível desbloquear o artista.');
      }
    });
  }

  alternarExplicito(): void {
    if (this.salvandoExplicito()) {
      return;
    }

    this.erro.set(null);
    this.salvandoExplicito.set(true);

    const acao = this.explicitoBloqueado()
      ? this.restricaoService.desbloquearExplicito(this.responsavelId, this.contaFilhaId)
      : this.restricaoService.bloquearExplicito(this.responsavelId, this.contaFilhaId);

    acao.subscribe({
      next: () => {
        this.salvandoExplicito.set(false);
        this.carregar(true);
      },
      error: (erro: HttpErrorResponse) => {
        this.salvandoExplicito.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível atualizar o bloqueio de conteúdo explícito.');
      }
    });
  }

  salvarLimite(): void {
    if (this.salvandoLimite()) {
      return;
    }

    this.erro.set(null);
    this.salvandoLimite.set(true);

    this.restricaoService.definirLimiteDiario(this.responsavelId, this.contaFilhaId, this.novoLimite).subscribe({
      next: () => {
        this.salvandoLimite.set(false);
        this.carregarLimite();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvandoLimite.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível atualizar o limite diário.');
      }
    });
  }
}
