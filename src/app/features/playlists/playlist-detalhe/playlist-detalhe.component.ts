import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { Musica } from '../../../core/models/models';

@Component({
  selector: 'app-playlist-detalhe',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './playlist-detalhe.component.html',
  styleUrl: './playlist-detalhe.component.scss'
})
export class PlaylistDetalheComponent implements OnInit {
  playlistId = 0;
  novaMusicaId: number | null = null;
  readonly musicas = signal<Musica[]>([]);
  readonly erro = signal<string | null>(null);

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly playlistService: PlaylistService
  ) {}

  ngOnInit(): void {
    this.playlistId = Number(this.route.snapshot.paramMap.get('playlistId'));
    this.carregar();
  }

  carregar(): void {
    this.playlistService.listarMusicas(this.usuarioId, this.playlistId).subscribe({
      next: (musicas) => this.musicas.set(musicas),
      error: () => this.erro.set('Não foi possível carregar as músicas da playlist.')
    });
  }

  adicionar(): void {
    if (!this.novaMusicaId) {
      return;
    }

    this.playlistService.adicionarMusica(this.playlistId, this.usuarioId, this.novaMusicaId).subscribe({
      next: () => {
        this.novaMusicaId = null;
        this.carregar();
      },
      error: () => this.erro.set('Não foi possível adicionar a música.')
    });
  }
}
