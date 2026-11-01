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

  /**
   * Reflete no app o perfil que acabou de mudar.
   *
   * O usuário fica guardado no localStorage desde o login; sem isto o header
   * continuaria mostrando o nome e a foto antigos até sair e entrar de novo.
   */
  atualizarUsuario(usuario: UsuarioLogado): void {
    this.usuario.set(usuario);
    try {
      localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    } catch {
      /* modo privado: o app segue com o valor em memória */
    }
  }

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
    const token = this.obterToken();

    if (!token) {
      return false;
    }

    if (this.tokenExpirado(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  private tokenExpirado(token: string): boolean {
    const partes = token.split('.');
    if (partes.length !== 3) {
      return true;
    }

    try {
      let payloadBase64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payload = JSON.parse(atob(payloadBase64));
      return typeof payload.exp !== 'number' || Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private salvarSessao(resposta: LoginSucesso): void {
    const usuario: UsuarioLogado = {
      id: resposta.id,
      nomeUsuario: resposta.nomeUsuario,
      email: resposta.email,
      planoId: resposta.planoId,
      foto: resposta.foto ?? null
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
