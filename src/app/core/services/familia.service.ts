import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dependente, HistoricoItem, MensagemResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class FamiliaService {
  private readonly baseUrl = `${environment.apiUrl}/familia`;

  constructor(private readonly http: HttpClient) {}

  listarDependentes(responsavelId: number): Observable<Dependente[]> {
    return this.http.get<Dependente[]>(`${this.baseUrl}/${responsavelId}/dependentes`);
  }

  adicionarDependente(responsavelId: number, nome: string, email: string, senha: string): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.baseUrl}/${responsavelId}/dependentes`, { nome, email, senha });
  }

  removerDependente(responsavelId: number, contaFilhaId: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}`);
  }

  listarHistorico(responsavelId: number, contaFilhaId: number): Observable<HistoricoItem[]> {
    return this.http.get<HistoricoItem[]>(`${this.baseUrl}/${responsavelId}/dependentes/${contaFilhaId}/historico`);
  }

  reautenticar(responsavelId: number, senha: string): Observable<{ confirmado: boolean }> {
    return this.http.post<{ confirmado: boolean }>(`${this.baseUrl}/${responsavelId}/reautenticar`, { senha });
  }
}
