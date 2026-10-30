import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  readonly erro = signal<string | null>(null);

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(private readonly authService: AuthService, private readonly playlistService: PlaylistService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.playlistService.listarPorUsuario(this.usuarioId).subscribe({
      next: (playlists) => this.playlists.set(playlists),
      error: () => this.erro.set('Não foi possível carregar as playlists.')
    });
  }

  criar(): void {
    if (!this.novoNome.trim()) {
      return;
    }

    this.playlistService.criar(this.usuarioId, this.novoNome).subscribe({
      next: () => {
        this.novoNome = '';
        this.carregar();
      },
      error: () => this.erro.set('Não foi possível criar a playlist.')
    });
  }
}
