import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { Playlist } from '../../../core/models/models';

@Component({
  selector: 'app-playlist-lista',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './playlist-lista.component.html',
  styleUrl: './playlist-lista.component.scss'
})
export class PlaylistListaComponent implements OnInit {
  novoNome = '';
  readonly playlists = signal<Playlist[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(private readonly authService: AuthService, private readonly playlistService: PlaylistService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.playlistService.listarPorUsuario(this.usuarioId).subscribe({
      next: (playlists) => {
        this.carregando.set(false);
        this.playlists.set(playlists);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar as playlists.');
      }
    });
  }

  criar(): void {
    if (this.salvando()) {
      return;
    }

    if (!this.novoNome.trim()) {
      this.erro.set('Digite um nome para a playlist.');
      return;
    }

    this.erro.set(null);
    this.salvando.set(true);

    this.playlistService.criar(this.usuarioId, this.novoNome).subscribe({
      next: () => {
        this.salvando.set(false);
        this.novoNome = '';
        this.carregar();
      },
      error: (erro: HttpErrorResponse) => {
        this.salvando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível criar a playlist.');
      }
    });
  }
}
