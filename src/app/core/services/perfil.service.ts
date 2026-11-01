import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UsuarioLogado } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly baseUrl = '/api/perfil';
  private readonly http = inject(HttpClient);

  obter(usuarioId: number): Observable<UsuarioLogado> {
    return this.http.get<UsuarioLogado>(`${this.baseUrl}/${usuarioId}`);
  }

  alterarNome(usuarioId: number, nome: string): Observable<UsuarioLogado> {
    return this.http.put<UsuarioLogado>(`${this.baseUrl}/${usuarioId}`, { nome });
  }

  /** observe:'events' para a barra de progresso do envio da foto. */
  enviarFoto(usuarioId: number, dados: FormData): Observable<HttpEvent<UsuarioLogado>> {
    return this.http.post<UsuarioLogado>(`${this.baseUrl}/${usuarioId}/foto`, dados, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
