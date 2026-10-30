import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MusicaService } from '../../../core/services/musica.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { Musica, Playlist } from '../../../core/models/models';

@Component({
  selector: 'app-playlist-detalhe',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './playlist-detalhe.component.html',
  styleUrl: './playlist-detalhe.component.scss'
})
export class PlaylistDetalheComponent implements OnInit {
  playlistId = 0;
  filtro = '';
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
  readonly reproduzindoId = signal<number | null>(null);

  readonly mensagem = signal<string | null>(null);
  readonly erro = signal<string | null>(null);

  readonly disponiveis = computed(() => {
    const jaNaPlaylist = new Set(this.musicas().map((m) => m.id));
    const termo = this.filtro.trim().toLowerCase();

    return this.todasMusicas()
      .filter((m) => !jaNaPlaylist.has(m.id))
      .filter((m) => !termo || m.titulo.toLowerCase().includes(termo));
  });

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly musicaService: MusicaService,
    private readonly playlistService: PlaylistService
  ) {}

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

  remover(musica: Musica): void {
    if (this.removendoId() !== null) {
      return;
    }

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

  reproduzir(musica: Musica): void {
    if (this.reproduzindoId() !== null) {
      return;
    }

    this.erro.set(null);
    this.mensagem.set(null);
    this.reproduzindoId.set(musica.id);

    this.musicaService.reproduzir(this.usuarioId, musica.id).subscribe({
      next: (resposta) => {
        this.reproduzindoId.set(null);
        this.mensagem.set(resposta.mensagem);
      },
      error: (erro: HttpErrorResponse) => {
        this.reproduzindoId.set(null);
        this.erro.set(erro.error?.erro ?? 'Não foi possível reproduzir esta música.');
      }
    });
  }
}
