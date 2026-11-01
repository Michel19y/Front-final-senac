import { Injectable, signal } from '@angular/core';

/** Quantas barras o medidor mostra. Barra larga demais lê como tijolo,
 *  não como espectro — daí tantas e tão finas. */
const BANDAS = 32;

/**
 * Lê o espectro do áudio que está tocando, para o medidor do player.
 *
 * É medição real, não animação decorativa: as barras vêm da FFT do som que
 * sai. Depende de CORS no servidor do áudio — o Storage do Supabase responde
 * `Access-Control-Allow-Origin: *`, então funciona. Se um dia a fonte não
 * mandar CORS, `ligar()` falha e o player simplesmente esconde o medidor.
 */
@Injectable({ providedIn: 'root' })
export class AnalisadorService {
  /** Altura de cada banda, 0 a 1. Vazio = medidor indisponível. */
  readonly niveis = signal<number[]>([]);
  readonly ativo = signal(false);

  private contexto?: AudioContext;
  private analisador?: AnalyserNode;
  private dados?: Uint8Array;
  private quadro?: number;
  /** createMediaElementSource só pode ser chamado UMA vez por elemento. */
  private ligado = false;
  /** Limites de bin de cada banda. Calculados uma vez, nao a cada quadro. */
  private bordas?: number[];

  /**
   * Conecta o elemento ao grafo de áudio. Precisa ser chamado dentro de um
   * gesto do usuário: AudioContext nasce suspenso e só o gesto o libera.
   */
  ligar(el: HTMLAudioElement): void {
    try {
      if (!this.contexto) {
        this.contexto = new AudioContext();
      }
      if (this.contexto.state === 'suspended') {
        void this.contexto.resume();
      }
      if (this.ligado) {
        return;
      }

      const fonte = this.contexto.createMediaElementSource(el);
      this.analisador = this.contexto.createAnalyser();
      // 256 => 128 bins, 4 por banda. Com 128 sobrava so 2 e a leitura ficava
      // granulada demais para 32 barras.
      this.analisador.fftSize = 256;
      this.analisador.smoothingTimeConstant = 0.75;

      // O elemento passa a sair PELO grafo: sem o connect ao destino,
      // o som some.
      fonte.connect(this.analisador);
      this.analisador.connect(this.contexto.destination);

      this.dados = new Uint8Array(this.analisador.frequencyBinCount);
      this.bordas = undefined;
      this.ligado = true;
    } catch {
      // Navegador sem Web Audio, ou fonte sem CORS: segue sem medidor.
      this.ligado = false;
      this.niveis.set([]);
    }
  }

  comecar(): void {
    if (!this.ligado || this.quadro !== undefined) {
      return;
    }
    this.ativo.set(true);

    const passo = () => {
      if (!this.analisador || !this.dados) {
        return;
      }
      this.analisador.getByteFrequencyData(this.dados);

      const bordas = this.bordas ??= calcularBordas(this.dados.length);

      const saida: number[] = [];
      for (let b = 0; b < BANDAS; b++) {
        const ini = bordas[b];
        const fim = bordas[b + 1];
        let soma = 0;
        for (let i = ini; i < fim; i++) {
          soma += this.dados[i];
        }
        const media = soma / (fim - ini) / 255;
        // Compensacao de inclinacao: a energia do som cai conforme a
        // frequencia sobe, entao sem ganho progressivo so os graves
        // apareceriam e metade do medidor ficaria morta. E o mesmo que
        // analisadores de audio de verdade fazem.
        // Inclinacao suave: com bandas logaritmicas cada barra ja cobre
        // uma fatia proporcional do espectro, entao o ganho progressivo
        // que as bandas lineares exigiam agora satura tudo em 1.
        const ganho = 1 + (b / BANDAS) * 0.6;
        const bruto = Math.min(1, media * ganho);

        // Curva compressiva, como a escala logaritmica de um VU. Sem ela so
        // os picos subiam e dois tercos das barras viviam no piso — o
        // medidor parecia morto mesmo com musica tocando.
        saida.push(Math.pow(bruto, 0.8));
      }
      this.niveis.set(saida);
      this.quadro = requestAnimationFrame(passo);
    };
    this.quadro = requestAnimationFrame(passo);
  }

  parar(): void {
    if (this.quadro !== undefined) {
      cancelAnimationFrame(this.quadro);
      this.quadro = undefined;
    }
    this.ativo.set(false);
    // Zera em vez de congelar: barra parada no meio parece travamento.
    this.niveis.set(this.ligado ? new Array(BANDAS).fill(0) : []);
  }
}

/**
 * Onde cada banda comeca e termina, em bins da FFT.
 *
 * Duas decisoes aqui:
 *
 * 1. Espacamento logaritmico. Com bins divididos em partes iguais, a
 *    primeira banda cobre varias oitavas e a ultima cobre quase nada — o
 *    grave vira uma barra so e o agudo, vinte barras identicas. O ouvido
 *    e logaritmico, e o medidor tem de ser tambem.
 *
 * 2. Para no bin correspondente a ~13,5 kHz. O preview e MP3 de 128 kbps,
 *    que corta perto de 16 kHz: acima disso nao ha som nenhum, e as barras
 *    ficavam cravadas no piso ocupando um terco da largura a toa.
 */
function calcularBordas(bins: number): number[] {
  const primeiro = 1;
  const ultimo = Math.max(primeiro + BANDAS, Math.floor(bins * 0.62));
  const razao = ultimo / primeiro;

  const saida: number[] = [];
  for (let b = 0; b <= BANDAS; b++) {
    const bruto = Math.round(primeiro * Math.pow(razao, b / BANDAS));
    // Nunca deixa uma banda vazia: com poucos bins no grave, dois limites
    // seguidos cairiam no mesmo indice e a divisao daria NaN.
    saida.push(b === 0 ? bruto : Math.max(bruto, saida[b - 1] + 1));
  }
  return saida;
}
