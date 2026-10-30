import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MensagemResponse, Musica, Playlist } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private readonly baseUrl = `${environment.apiUrl}/playlists`;

  constructor(private readonly http: HttpClient) {}

  listarPorUsuario(usuarioId: number): Observable<Playlist[]> {
    return this.http.get<Playlist[]>(`${this.baseUrl}/${usuarioId}`);
  }

  criar(usuarioId: number, nome: string): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(this.baseUrl, { usuarioId, nome });
  }

  listarMusicas(usuarioId: number, playlistId: number): Observable<Musica[]> {
    return this.http.get<Musica[]>(`${this.baseUrl}/${usuarioId}/${playlistId}/musicas`);
  }

  adicionarMusica(playlistId: number, usuarioId: number, musicaId: number): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.baseUrl}/${playlistId}/musicas`, { usuarioId, musicaId });
  }

  removerMusica(usuarioId: number, playlistId: number, musicaId: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(`${this.baseUrl}/${usuarioId}/${playlistId}/musicas/${musicaId}`);
  }

  renomear(playlistId: number, usuarioId: number, nome: string): Observable<MensagemResponse> {
    return this.http.put<MensagemResponse>(`${this.baseUrl}/${playlistId}`, { usuarioId, nome });
  }
}
