import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MusicaService } from '../../../core/services/musica.service';
import { Musica } from '../../../core/models/models';

@Component({
  selector: 'app-musica-lista',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './musica-lista.component.html',
  styleUrl: './musica-lista.component.scss'
})
export class MusicaListaComponent implements OnInit {
  termo = '';
  readonly musicas = signal<Musica[]>([]);
  readonly mensagem = signal<string | null>(null);
  readonly erro = signal<string | null>(null);

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(private readonly authService: AuthService, private readonly musicaService: MusicaService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.musicaService.listar(this.usuarioId).subscribe({
      next: (musicas) => this.musicas.set(musicas),
      error: () => this.erro.set('Não foi possível carregar as músicas.')
    });
  }

  buscar(): void {
    if (!this.termo.trim()) {
      this.carregar();
      return;
    }

    this.musicaService.buscar(this.usuarioId, this.termo).subscribe({
      next: (musicas) => this.musicas.set(musicas),
      error: () => this.erro.set('Não foi possível buscar as músicas.')
    });
  }

  reproduzir(musica: Musica): void {
    this.mensagem.set(null);
    this.musicaService.reproduzir(this.usuarioId, musica.id).subscribe({
      next: (resposta) => this.mensagem.set(resposta.mensagem),
      error: () => this.erro.set('Não foi possível reproduzir esta música.')
    });
  }
}
