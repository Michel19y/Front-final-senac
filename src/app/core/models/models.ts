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
  /** A API devolve no login; sem isso a foto sumiria a cada entrada. */
  foto?: string | null;
}

export type LoginResponse = LoginPrecisaConfigurar2fa | LoginSucesso;

export interface UsuarioLogado {
  id: number;
  nomeUsuario: string;
  email: string;
  planoId: number;
  /** URL da foto de perfil; ausente = sem foto. */
  foto?: string | null;
}

export interface Musica {
  id: number;
  titulo: string;
  albumId?: number | null;
  explicito: boolean;
  /** URL do arquivo de áudio; ausente = faixa sem áudio associado. */
  urlAudio?: string | null;
  /** Artista principal, vindo de join em track_artists. */
  artista?: string | null;
  /** URL da capa do álbum. */
  capa?: string | null;
}

export interface Playlist {
  id: number;
  usuarioId: number;
  nomePlaylist: string;
  /** Quantas faixas tem. Vem de projeção, não é coluna. */
  totalFaixas?: number;
  /** Até 4 capas, para o mosaico do cartão. */
  capas?: string[];
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

/** A URL vem na resposta porque expira: o banco guarda só o id no Deezer. */
export interface ReproducaoResponse extends MensagemResponse {
  urlAudio?: string | null;
}

export interface ArtistaBusca {
  id: number;
  nomeArtista: string;
  /** Quantas faixas do catálogo seriam cortadas ao bloquear este artista. */
  faixas: number;
}
