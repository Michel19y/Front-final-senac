import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CadastroRequest, CadastroResponse, LoginRequest, LoginResponse, LoginSucesso, UsuarioLogado } from '../models/models';

const CHAVE_TOKEN = 'spotifei_token';
const CHAVE_USUARIO = 'spotifei_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/autenticacao`;
  readonly usuario = signal<UsuarioLogado | null>(this.carregarUsuario());

  constructor(private readonly http: HttpClient) {}

  cadastrar(request: CadastroRequest): Observable<CadastroResponse> {
    return this.http.post<CadastroResponse>(`${this.baseUrl}/cadastro`, request);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, request).pipe(
      tap((resposta) => {
        if (this.ehSucesso(resposta)) {
          this.salvarSessao(resposta);
        }
      })
    );
  }

  ehSucesso(resposta: LoginResponse): resposta is LoginSucesso {
    return (resposta as LoginSucesso).token !== undefined;
  }

  logout(): void {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    this.usuario.set(null);
  }

  obterToken(): string | null {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  estaAutenticado(): boolean {
    return !!this.obterToken();
  }

  private salvarSessao(resposta: LoginSucesso): void {
    const usuario: UsuarioLogado = {
      id: resposta.id,
      nomeUsuario: resposta.nomeUsuario,
      email: resposta.email,
      planoId: resposta.planoId
    };
    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    this.usuario.set(usuario);
  }

  private carregarUsuario(): UsuarioLogado | null {
    const bruto = localStorage.getItem(CHAVE_USUARIO);
    return bruto ? (JSON.parse(bruto) as UsuarioLogado) : null;
  }
}
