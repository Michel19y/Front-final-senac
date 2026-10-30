export type Plano = 'BASICO' | 'PADRAO' | 'PREMIUM';

export interface CadastroRequest {
  nome: string;
  email: string;
  cpf: string;
  senha: string;
  plano: Plano;
}

export interface CadastroResponse {
  usuarioId: number;
  totpSecret: string;
  qrCodeBase64: string;
  mensagem: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
  codigo2fa?: string;
}

export interface LoginPrecisaConfigurar2fa {
  precisaConfigurar2fa: true;
  totpSecret: string;
  qrCodeBase64: string;
  mensagem: string;
}

export interface LoginSucesso {
  token: string;
  expiraEm: string;
  id: number;
  nomeUsuario: string;
  email: string;
  planoId: number;
}

export type LoginResponse = LoginPrecisaConfigurar2fa | LoginSucesso;

export interface UsuarioLogado {
  id: number;
  nomeUsuario: string;
  email: string;
  planoId: number;
}

export interface Musica {
  id: number;
  titulo: string;
  albumId?: number | null;
  explicito: boolean;
}

export interface Playlist {
  id: number;
  usuarioId: number;
  nomePlaylist: string;
}

export interface Dependente {
  id: number;
  nomeUsuario: string;
  email: string;
  planoId?: number | null;
  responsavelId?: number | null;
  limiteDiarioReproducoes?: number | null;
}

export interface HistoricoItem {
  dataHora: string;
  titulo: string;
}

export type TipoRestricao = 'ARTISTA' | 'EXPLICITO_GERAL';

export interface Restricao {
  id: number;
  tipo: TipoRestricao;
  artistaId?: number | null;
  nomeArtista?: string | null;
}

export interface LimiteDiario {
  limiteDiario: number | null;
  reproduzidasHoje: number;
}

export interface MensagemResponse {
  mensagem: string;
}

export interface ArtistaBusca {
  id: number;
  nomeArtista: string;
}
