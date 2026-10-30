import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ArtistaBusca, LimiteDiario, MensagemResponse, Restricao } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RestricaoService {
  private readonly baseUrl = `${environment.apiUrl}/familia`;

  constructor(private readonly http: HttpClient) {}

  buscarArtistas(nome: string): Observable<ArtistaBusca[]> {
    return this.http.get<ArtistaBusca[]>(`${this.baseUrl}/artistas/buscar`, { params: { nome } });
  }

  listar(responsavelId: number, contaFilhaId: number): Observable<Restricao[]> {
    return this.http.get<Restricao[]>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/restricoes`);
  }

  bloquearArtista(responsavelId: number, contaFilhaId: number, artistaId: number): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(
      `${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/restricoes/artistas/${artistaId}`,
      {}
    );
  }

  desbloquearArtista(responsavelId: number, contaFilhaId: number, artistaId: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(
      `${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/restricoes/artistas/${artistaId}`
    );
  }

  bloquearExplicito(responsavelId: number, contaFilhaId: number): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/restricoes/explicito`, {});
  }

  desbloquearExplicito(responsavelId: number, contaFilhaId: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/restricoes/explicito`);
  }

  obterLimiteDiario(responsavelId: number, contaFilhaId: number): Observable<LimiteDiario> {
    return this.http.get<LimiteDiario>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/limite-diario`);
  }

  definirLimiteDiario(responsavelId: number, contaFilhaId: number, limite: number | null): Observable<MensagemResponse> {
    return this.http.put<MensagemResponse>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/limite-diario`, { limite });
  }
}
