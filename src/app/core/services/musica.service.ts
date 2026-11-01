import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MensagemResponse, Musica , ReproducaoResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MusicaService {
  private readonly baseUrl = `${environment.apiUrl}/musicas`;

  constructor(private readonly http: HttpClient) {}

  listar(usuarioId: number): Observable<Musica[]> {
    return this.http.get<Musica[]>(`${this.baseUrl}/${usuarioId}`);
  }

  /** Últimas faixas tocadas, sem repetir. Alimenta a faixa de recentes. */
  recentes(usuarioId: number): Observable<Musica[]> {
    return this.http.get<Musica[]>(`${this.baseUrl}/${usuarioId}/recentes`);
  }

  buscar(usuarioId: number, termo: string): Observable<Musica[]> {
    return this.http.get<Musica[]>(`${this.baseUrl}/buscar`, { params: { usuarioId, termo } });
  }

  /** reportProgress + observe:'events' para a barra de progresso do upload. */
  enviar(dados: FormData): Observable<HttpEvent<Musica>> {
    return this.http.post<Musica>(this.baseUrl, dados, {
      reportProgress: true,
      observe: 'events'
    });
  }

  reproduzir(usuarioId: number, musicaId: number): Observable<ReproducaoResponse> {
    return this.http.post<ReproducaoResponse>(`${this.baseUrl}/reproduzir`, { usuarioId, musicaId });
  }
}
