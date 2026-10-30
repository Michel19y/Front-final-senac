import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MensagemResponse, Musica } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MusicaService {
  private readonly baseUrl = `${environment.apiUrl}/musicas`;

  constructor(private readonly http: HttpClient) {}

  listar(usuarioId: number): Observable<Musica[]> {
    return this.http.get<Musica[]>(`${this.baseUrl}/${usuarioId}`);
  }

  buscar(usuarioId: number, termo: string): Observable<Musica[]> {
    return this.http.get<Musica[]>(`${this.baseUrl}/buscar`, { params: { usuarioId, termo } });
  }

  reproduzir(usuarioId: number, musicaId: number): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.baseUrl}/reproduzir`, { usuarioId, musicaId });
  }
}
