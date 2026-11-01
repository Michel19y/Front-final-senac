import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Musica } from '../models/models';
import { AnalisadorService } from './analisador.service';
import { MusicaService } from './musica.service';
import { AuthService } from './auth.service';

/** WAV silencioso de 1 frame: mantém o elemento ativo durante o gesto. */
const SILENCIO =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

const CHAVE_AUTO = 'spotifei_automatico';
const CHAVE_ALEATORIO = 'spotifei_aleatorio';

/**
 * Toca áudio e manda na fila.
 *
 * COMO O GESTO É RESPEITADO
 *
 * Navegador de celular só autoriza play() com ativação do usuário no momento
 * da chamada. Como a autorização da API é assíncrona, a reprodução começa no
 * clique mas MUDA; o som só é liberado quando a API responde. Se ela recusar,
 * para antes de sair qualquer áudio.
 *
 * Isso não fura o controle parental: a lista já vem filtrada pelo servidor
 * (artista bloqueado e explícito nunca chegam ao aparelho). O que o endpoint
 * ainda decide é o limite diário — e aí nada é ouvido.
 */
@Injectable({ providedIn: 'root' })
export class PlayerService {
  readonly faixa = signal<Musica | null>(null);
  readonly tocando = signal(false);
  readonly carregando = signal(false);
  readonly posicao = signal(0);
  readonly duracao = signal(0);
  readonly volume = signal(1);
  readonly erro = signal<string | null>(null);

  /** Faixa cuja autorização está em andamento; a lista usa para desabilitar. */
  readonly pedindoId = signal<number | null>(null);

  /** Contexto de reprodução: o que estava na tela quando apertou play. */
  readonly fila = signal<Musica[]>([]);

  /** Emenda automática: ao terminar, toca a próxima. */
  readonly automatico = signal(leu(CHAVE_AUTO, true));

  /**
   * Console aberto. Mora aqui, e não na barra, porque o shell também precisa
   * saber: é ele que mede a coluna de conteúdo onde o console se encaixa.
   */
  readonly expandido = signal(false);

  recolher(): void {
    this.expandido.set(false);
  }

  private audio?: HTMLAudioElement;

  private readonly analisador = inject(AnalisadorService);
  private readonly musicaService = inject(MusicaService);
  private readonly auth = inject(AuthService);

  /** Níveis do medidor, lidos do áudio de verdade. */
  readonly niveis = this.analisador.niveis;

  /**
   * Quatro bandas para os medidores miniatura (linha da lista e da fila).
   *
   * As 32 do medidor grande viram um borrão numa capa de 40px. São colhidas
   * espalhadas pelo espectro, e não as quatro primeiras, senão as quatro
   * mostrariam o mesmo grave.
   */
  readonly niveisCurtos = computed(() => {
    const n = this.niveis();
    if (!n.length) {
      return [];
    }
    return [0.12, 0.34, 0.56, 0.78].map(fatia => n[Math.floor(fatia * n.length)] ?? 0);
  });

  /** Embaralhar na ordem de caminhada, não na lista: a fila mostrada
   *  continua sendo a mesma, só o caminho por ela muda. */
  readonly aleatorio = signal(leu(CHAVE_ALEATORIO, false));

  /** Muda para pedir um embaralhamento novo sem trocar de fila. */
  private readonly semente = signal(0);

  private readonly indice = computed(() => {
    const f = this.faixa();
    return f ? this.fila().findIndex(m => m.id === f.id) : -1;
  });

  /**
   * Em que ordem a fila é percorrida: direta, ou uma permutação.
   *
   * Permutação, e não sorteio a cada faixa: sorteando, a mesma música
   * reaparece em três faixas e metade da fila nunca toca. Assim o
   * aleatório percorre tudo uma vez antes de repetir.
   */
  private readonly ordem = computed(() => {
    const n = this.fila().length;
    const base = Array.from({ length: n }, (_, i) => i);
    if (!this.aleatorio()) {
      return base;
    }
    this.semente();
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base;
  });

  /** Onde a faixa atual está no caminho (não na lista). */
  private readonly passoAtual = computed(() => {
    const i = this.indice();
    return i < 0 ? -1 : this.ordem().indexOf(i);
  });

  readonly proximaFaixa = computed(() => this.vizinha(1));
  readonly faixaAnterior = computed(() => this.vizinha(-1));

  /** Lugar da faixa atual no caminho, contando de 1. Zero quando está fora. */
  readonly posicaoNaFila = computed(() => this.passoAtual() + 1);

  /** O que vem depois da atual, já na ordem real de reprodução. */
  readonly proximas = computed(() => {
    const lista = this.fila();
    const ordem = this.ordem();
    const pos = this.passoAtual();
    if (pos < 0) {
      return [];
    }
    const saida: Musica[] = [];
    for (let k = 1; k < ordem.length; k++) {
      saida.push(lista[ordem[(pos + k) % ordem.length]]);
    }
    return saida;
  });

  alternarAleatorio(): void {
    this.aleatorio.update(a => {
      const novo = !a;
      guardou(CHAVE_ALEATORIO, novo);
      // Religar embaralha de novo em vez de repetir a ordem anterior.
      if (novo) {
        this.semente.update(s => s + 1);
      }
      return novo;
    });
  }

  /** Progresso de 0 a 1 — o traço na lista e a barra do console usam o mesmo. */
  readonly fracao = computed(() => {
    const d = this.duracao();
    return isFinite(d) && d > 0 ? Math.min(1, this.posicao() / d) : 0;
  });

  private vizinha(passo: number): Musica | null {
    const lista = this.fila();
    const ordem = this.ordem();
    const pos = this.passoAtual();
    if (pos < 0 || !ordem.length) {
      return null;
    }
    // Circular: no fim volta pro começo, senão o automático morre na última.
    const j = ordem[(pos + passo + ordem.length) % ordem.length];
    return j === this.indice() ? null : lista[j];
  }

  alternarAutomatico(): void {
    this.automatico.update(a => {
      const novo = !a;
      guardou(CHAVE_AUTO, novo);
      return novo;
    });
  }

  // ---------------------------------------------------------- reprodução

  /**
   * Único caminho para tocar. Precisa ser chamado DENTRO do gesto do clique
   * — o play() mudo acontece aqui, antes de qualquer requisição.
   */
  pedirParaTocar(musica: Musica, contexto?: Musica[]): void {
    if (contexto) {
      this.fila.set(contexto);
    }

    // Mesma faixa: é só pausar/retomar, e já estamos no gesto.
    if (this.faixa()?.id === musica.id) {
      this.alternar();
      return;
    }
    if (this.pedindoId() !== null) {
      return;
    }

    this.erro.set(null);
    this.iniciarMudo(musica);
    this.pedindoId.set(musica.id);

    const usuarioId = this.auth.usuario()?.id ?? 0;
    this.musicaService.reproduzir(usuarioId, musica.id).subscribe({
      next: (resposta) => {
        this.pedindoId.set(null);
        this.liberarSom(resposta.urlAudio);
      },
      error: (e: HttpErrorResponse) => {
        this.pedindoId.set(null);
        this.cancelar();
        this.erro.set(e.error?.erro ?? 'Não foi possível reproduzir esta música.');
      }
    });
  }

  proxima(): void {
    const m = this.proximaFaixa();
    if (m) {
      this.pedirParaTocar(m);
    }
  }

  anterior(): void {
    // Passou de 3s, "anterior" volta ao início da faixa — como todo player.
    if (this.posicao() > 3) {
      this.irPara(0);
      return;
    }
    const m = this.faixaAnterior();
    if (m) {
      this.pedirParaTocar(m);
    }
  }

  private iniciarMudo(musica: Musica): void {
    const el = this.obterAudio();
    this.analisador.ligar(el);

    this.faixa.set(musica);
    this.posicao.set(0);
    this.duracao.set(0);
    this.carregando.set(true);
    el.muted = true;
    el.loop = true;
    el.src = SILENCIO;
    el.play().catch(() => { /* só o silêncio; o erro real aparece depois */ });
  }

  private liberarSom(url: string | null | undefined): void {
    const el = this.audio;
    const f = this.faixa();
    if (!el || !f) {
      return;
    }
    if (!url) {
      this.cancelar();
      this.erro.set(`Não foi possível obter o áudio de "${f.titulo}". Tente de novo.`);
      return;
    }

    el.loop = false;
    el.muted = false;
    el.src = url;
    el.play()
      .then(() => this.tocando.set(true))
      .catch(() => {
        this.carregando.set(false);
        this.tocando.set(false);
        this.erro.set(`O navegador bloqueou o áudio de "${f.titulo}". Toque novamente.`);
      });
  }

  cancelar(): void {
    const el = this.audio;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    this.tocando.set(false);
    this.carregando.set(false);
    this.faixa.set(null);
    this.posicao.set(0);
    this.duracao.set(0);
  }

  alternar(): void {
    const el = this.audio;
    if (!el || !this.faixa()) {
      return;
    }
    if (el.paused) {
      el.play().then(() => this.tocando.set(true)).catch(() => this.tocando.set(false));
    } else {
      el.pause();
      this.tocando.set(false);
    }
  }

  irPara(segundos: number): void {
    const el = this.audio;
    if (el && isFinite(el.duration)) {
      el.currentTime = Math.max(0, Math.min(segundos, el.duration));
      this.posicao.set(el.currentTime);
    }
  }

  definirVolume(v: number): void {
    const el = this.obterAudio();
    el.volume = Math.max(0, Math.min(1, v));
    this.volume.set(el.volume);
  }

  fechar(): void {
    this.audio?.pause();
    this.tocando.set(false);
    this.faixa.set(null);
    this.expandido.set(false);
  }

  /** Quanto falta. Mais útil que repetir a duração. */
  restante(): number {
    const d = this.duracao();
    return isFinite(d) && d > 0 ? Math.max(0, d - this.posicao()) : NaN;
  }

  /** mm:ss — e "--:--" enquanto a duração não chegou. */
  formatar(s: number): string {
    if (!isFinite(s) || s < 0) {
      return '--:--';
    }
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  private obterAudio(): HTMLAudioElement {
    if (!this.audio) {
      const el = new Audio();
      // Antes de qualquer src: sem isso a fonte fica "suja" e o analisador
      // só lê zeros. O Storage do Supabase responde com CORS liberado.
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.addEventListener('loadedmetadata', () => {
        this.duracao.set(el.duration);
        this.carregando.set(false);
      });
      el.addEventListener('timeupdate', () => this.posicao.set(el.currentTime));
      el.addEventListener('playing', () => {
        this.tocando.set(true);
        this.carregando.set(false);
        this.analisador.comecar();
      });
      el.addEventListener('waiting', () => this.carregando.set(true));
      el.addEventListener('pause', () => {
        this.tocando.set(false);
        this.analisador.parar();
      });
      el.addEventListener('ended', () => {
        this.tocando.set(false);
        this.posicao.set(0);
        this.analisador.parar();
        // Emenda automática. O elemento já foi ativado por gesto antes, então
        // o navegador permite continuar — não é autoplay do nada.
        if (this.automatico()) {
          this.proxima();
        }
      });
      el.addEventListener('error', () => {
        this.carregando.set(false);
        this.tocando.set(false);
        const f = this.faixa();
        if (f && el.getAttribute('src')) {
          this.erro.set(`Falha ao carregar o áudio de "${f.titulo}".`);
        }
      });
      this.audio = el;
    }
    return this.audio;
  }
}

function leu(chave: string, padrao: boolean): boolean {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto === null ? padrao : bruto === 'true';
  } catch {
    // Modo privado: segue com o padrão, sem lembrar entre sessões.
    return padrao;
  }
}

function guardou(chave: string, valor: boolean): void {
  try {
    localStorage.setItem(chave, String(valor));
  } catch { /* modo privado */ }
}
