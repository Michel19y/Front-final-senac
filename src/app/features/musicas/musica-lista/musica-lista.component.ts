import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
  readonly termoBuscado = signal<string | null>(null);
  readonly carregando = signal(false);
  readonly processandoId = signal<number | null>(null);
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
    this.erro.set(null);
    this.carregando.set(true);
    this.termoBuscado.set(null);

    this.musicaService.listar(this.usuarioId).subscribe({
      next: (musicas) => {
        this.carregando.set(false);
        this.musicas.set(musicas);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar as músicas.');
      }
    });
  }

  buscar(): void {
    if (!this.termo.trim()) {
      this.carregar();
      return;
    }

    this.erro.set(null);
    this.carregando.set(true);

    this.musicaService.buscar(this.usuarioId, this.termo).subscribe({
      next: (musicas) => {
        this.carregando.set(false);
        this.termoBuscado.set(this.termo);
        this.musicas.set(musicas);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível buscar as músicas.');
      }
    });
  }

  limparBusca(): void {
    this.termo = '';
    this.carregar();
  }

  reproduzir(musica: Musica): void {
    if (this.processandoId() !== null) {
      return;
    }

    this.erro.set(null);
    this.mensagem.set(null);
    this.processandoId.set(musica.id);

    this.musicaService.reproduzir(this.usuarioId, musica.id).subscribe({
      next: (resposta) => {
        this.processandoId.set(null);
        this.mensagem.set(resposta.mensagem);
      },
      error: (erro: HttpErrorResponse) => {
        this.processandoId.set(null);
        this.erro.set(erro.error?.erro ?? 'Não foi possível reproduzir esta música.');
      }
    });
  }
}
