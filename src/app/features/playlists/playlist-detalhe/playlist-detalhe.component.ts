import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MusicaService } from '../../../core/services/musica.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { Musica, Playlist } from '../../../core/models/models';
import { ConfirmacaoComponent } from '../../../shared/confirmacao/confirmacao.component';
import { PlayerService } from '../../../core/services/player.service';

const POR_PAGINA = 20;

/** Minúsculas e sem acento, para "coracao" achar "Coração". */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

@Component({
  selector: 'app-playlist-detalhe',
  standalone: true,
  imports: [FormsModule, RouterLink, ConfirmacaoComponent],
  templateUrl: './playlist-detalhe.component.html',
  styleUrl: './playlist-detalhe.component.scss'
})
export class PlaylistDetalheComponent implements OnInit {
  playlistId = 0;
  readonly filtro = signal('');
  readonly pagina = signal(1);
  nomeEditado = '';

  readonly playlist = signal<Playlist | null>(null);
  readonly editandoNome = signal(false);
  readonly salvandoNome = signal(false);

  readonly musicas = signal<Musica[]>([]);
  readonly todasMusicas = signal<Musica[]>([]);
  readonly carregando = signal(false);
  readonly carregandoCatalogo = signal(false);
  readonly adicionandoId = signal<number | null>(null);
  readonly removendoId = signal<number | null>(null);

  /** Música aguardando confirmação de remoção; null = diálogo fechado. */
  readonly aRemover = signal<Musica | null>(null);

  readonly mensagem = signal<string | null>(null);
  readonly erro = signal<string | null>(null);

  /** Catálogo menos o que já está na playlist, filtrado por título E artista. */
  readonly disponiveis = computed(() => {
    const jaNaPlaylist = new Set(this.musicas().map((m) => m.id));
    const termo = normalizar(this.filtro().trim());

    return this.todasMusicas()
      .filter((m) => !jaNaPlaylist.has(m.id))
      .filter((m) => !termo ||
        normalizar(m.titulo).includes(termo) ||
        normalizar(m.artista ?? '').includes(termo));
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.disponiveis().length / POR_PAGINA)));

  /** O catálogo tem centenas de faixas: despejar tudo de uma vez trava a tela. */
  readonly visiveis = computed(() => {
    const inicio = (this.pagina() - 1) * POR_PAGINA;
    return this.disponiveis().slice(inicio, inicio + POR_PAGINA);
  });

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    readonly player: PlayerService,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly musicaService: MusicaService,
    private readonly playlistService: PlaylistService
  ) {
    // Filtro mudou, volta pra primeira página: ficar numa página 9 que não
    // existe mais no resultado novo mostraria lista vazia sem explicação.
    effect(() => {
      this.filtro();
      this.pagina.set(1);
    }, { allowSignalWrites: true });
  }

  /** Inicial do artista, no lugar da capa quando a faixa não tem arte. */
  inicialDe(musica: Musica): string {
    const base = normalizar((musica.artista || musica.titulo || '').trim());
    const c = base.charAt(0).toUpperCase();
    return c >= 'A' && c <= 'Z' ? c : '#';
  }

  ehAtual(musica: Musica): boolean {
    return this.player.faixa()?.id === musica.id;
  }

  /** O que o leitor de tela anuncia: a linha toda virou um botão. */
  rotuloDe(musica: Musica): string {
    const nome = `${musica.titulo}, ${musica.artista || 'artista desconhecido'}`;
    if (this.player.pedindoId() === musica.id) {
      return `Abrindo ${nome}`;
    }
    if (this.ehAtual(musica)) {
      return this.player.tocando() ? `Pausar ${nome}` : `Retomar ${nome}`;
    }
    return `Tocar ${nome}`;
  }



  irPara(p: number): void {
    this.pagina.set(Math.max(1, Math.min(p, this.totalPaginas())));
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.playlistId = Number(params.get('playlistId'));
      this.carregarPlaylist();
      this.carregar();
      this.carregarCatalogo();
    });
  }

  carregarPlaylist(): void {
    this.playlistService.listarPorUsuario(this.usuarioId).subscribe({
      next: (playlists) => {
        const atual = playlists.find((p) => p.id === this.playlistId) ?? null;
        this.playlist.set(atual);
        this.nomeEditado = atual?.nomePlaylist ?? '';
      },
      error: () => {
        /* o nome é só um complemento visual; erro aqui não impede o resto da tela */
      }
    });
  }

  carregar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.playlistService.listarMusicas(this.usuarioId, this.playlistId).subscribe({
      next: (musicas) => {
        this.carregando.set(false);
        this.musicas.set(musicas);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar as músicas da playlist.');
      }
    });
  }

  carregarCatalogo(): void {
    this.carregandoCatalogo.set(true);

    this.musicaService.listar(this.usuarioId).subscribe({
      next: (musicas) => {
        this.carregandoCatalogo.set(false);
        this.todasMusicas.set(musicas);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregandoCatalogo.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar o catálogo de músicas.');
      }
    });
  }

  iniciarEdicaoNome(): void {
    this.nomeEditado = this.playlist()?.nomePlaylist ?? '';
    this.editandoNome.set(true);
  }

  cancelarEdicaoNome(): void {
    this.editandoNome.set(false);
  }

  salvarNome(): void {
    if (!this.nomeEditado.trim() || this.salvandoNome()) {
      return;
    }

    this.erro.set(null);
    this.salvandoNome.set(true);

    this.playlistService.renomear(this.playlistId, this.usuarioId, this.nomeEditado).subscribe({
      next: () => {
        this.salvandoNome.set(false);
        this.editandoNome.set(false);
        this.carregarPlaylist();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvandoNome.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível renomear a playlist.');
      }
    });
  }

  adicionar(musica: Musica): void {
    if (this.adicionandoId() !== null) {
      return;
    }

    this.erro.set(null);
    this.adicionandoId.set(musica.id);

    this.playlistService.adicionarMusica(this.playlistId, this.usuarioId, musica.id).subscribe({
      next: () => {
        this.adicionandoId.set(null);
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => {
        this.adicionandoId.set(null);
        this.erro.set(erro.error?.erro ?? 'Não foi possível adicionar a música.');
      }
    });
  }

  /** Só abre o diálogo — a remoção de fato acontece em confirmarRemocao(). */
  remover(musica: Musica): void {
    this.aRemover.set(musica);
  }

  cancelarRemocao(): void {
    this.aRemover.set(null);
  }

  confirmarRemocao(): void {
    const musica = this.aRemover();
    if (!musica || this.removendoId() !== null) {
      return;
    }

    this.aRemover.set(null);
    this.erro.set(null);
    this.removendoId.set(musica.id);

    this.playlistService.removerMusica(this.usuarioId, this.playlistId, musica.id).subscribe({
      next: () => {
        this.removendoId.set(null);
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => {
        this.removendoId.set(null);
        this.erro.set(erro.error?.erro ?? 'Não foi possível remover a música da playlist.');
      }
    });
  }

  /** As músicas desta playlist viram a fila do player. */
  reproduzir(musica: Musica): void {
    this.player.pedirParaTocar(musica, this.musicas());
  }
}
