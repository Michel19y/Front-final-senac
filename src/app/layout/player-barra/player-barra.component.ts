import { Component, HostBinding, effect, inject, signal } from '@angular/core';
import { PlayerService } from '../../core/services/player.service';
import { PlayerPalcoComponent } from '../player-palco/player-palco.component';

/** Acima disso, o gesto conta como intenção de abrir/fechar. */
const DISTANCIA_MINIMA = 60;

/** px/ms. Um peteleco rápido vale mais que a distância percorrida. */
const VELOCIDADE_MINIMA = 0.35;

@Component({
  selector: 'app-player-barra',
  standalone: true,
  imports: [PlayerPalcoComponent],
  templateUrl: './player-barra.component.html',
  styleUrl: './player-barra.component.scss'
})
export class PlayerBarraComponent {
  readonly player = inject(PlayerService);

  /** Estado do console; vive no serviço porque o shell também lê. */
  readonly aberto = this.player.expandido;
  readonly arrastando = signal(false);
  /** Quanto o painel está deslocado durante o arraste, em px. */
  readonly deslocamento = signal(0);

  private inicioY = 0;
  private inicioEm = 0;
  private alturaPainel = 0;
  private alturaCompacta = 0;
  /** O navegador dispara click depois do pointerup; sem isto, todo arraste
   *  seria desfeito na sequência pelo toggle do clique. */
  private houveArraste = false;

  @HostBinding('class.expandido') get expandido() { return this.aberto(); }

  constructor() {
    // O console tapa a coluna de conteudo inteira: deixar a pagina rolar
    // atras so desenha uma barra inutil na direita e rola o que nao se ve.
    // A barra lateral tem rolagem propria e segue utilizavel.
    effect(() => {
      const travar = this.aberto() ? 'hidden' : '';
      // Nos dois: overflow no body nem sempre propaga para a viewport,
      // e sem o <html> a pagina continua rolando atras do painel.
      document.documentElement.style.overflow = travar;
      document.body.style.overflow = travar;
    });
  }

  aoArrastar(evento: Event): void {
    this.player.irPara(Number((evento.target as HTMLInputElement).value));
  }

  aoMudarVolume(evento: Event): void {
    this.player.definirVolume(Number((evento.target as HTMLInputElement).value));
  }

  /** Toque seco no puxador abre/fecha. Arraste já decidiu em terminarArraste. */
  /**
   * Fecha o painel inteiro: desce com animação e só então solta a faixa.
   * Limpar na hora faria o painel sumir seco, sem transição nenhuma.
   */
  sairComAnimacao(): void {
    this.aberto.set(false);
    setTimeout(() => this.player.fechar(), 320);
  }

  alternarPainel(): void {
    if (this.houveArraste) {
      this.houveArraste = false;
      return;
    }
    this.aberto.update(a => !a);
  }

  // ---------------------------------------------------------------- arraste

  comecarArraste(e: PointerEvent): void {
    // Ignora toque secundário: trocar de dedo no meio faria o painel saltar.
    if (this.arrastando()) {
      return;
    }
    const alvo = e.currentTarget as HTMLElement;
    alvo.setPointerCapture(e.pointerId);

    this.inicioY = e.clientY;
    this.inicioEm = Date.now();
    const painel = alvo.closest('.player') as HTMLElement | null;
    this.alturaPainel = painel?.offsetHeight || window.innerHeight;
    // Fechado, o painel desce até sobrar só a barra compacta à mostra.
    this.alturaCompacta = (painel?.querySelector('.compacta') as HTMLElement)?.offsetHeight || 88;
    this.arrastando.set(true);
    this.houveArraste = false;
    this.deslocamento.set(0);
  }

  moverArraste(e: PointerEvent): void {
    if (!this.arrastando()) {
      return;
    }
    const bruto = e.clientY - this.inicioY;
    if (Math.abs(bruto) > 6) {
      this.houveArraste = true;
    }

    // Para cima quando aberto, ou para baixo quando fechado, não há para
    // onde ir: em vez de travar seco, o movimento ganha atrito. Parar de
    // repente parece que a tela travou.
    const paraFora = this.aberto() ? bruto < 0 : bruto > 0;
    this.deslocamento.set(paraFora ? bruto * 0.25 : bruto);
  }

  terminarArraste(e: PointerEvent): void {
    if (!this.arrastando()) {
      return;
    }
    const percorrido = e.clientY - this.inicioY;
    const tempo = Math.max(1, Date.now() - this.inicioEm);
    const velocidade = Math.abs(percorrido) / tempo;

    this.arrastando.set(false);
    this.deslocamento.set(0);

    const decisivo = Math.abs(percorrido) > DISTANCIA_MINIMA || velocidade > VELOCIDADE_MINIMA;
    if (!decisivo) {
      return;
    }
    // Arrastou para cima abre; para baixo fecha.
    this.aberto.set(percorrido < 0);
  }

  /** Translação durante o arraste. Fora dele, quem manda é a classe CSS. */
  get estiloPainel(): string | null {
    if (!this.arrastando()) {
      return null;
    }
    const fechado = Math.max(0, this.alturaPainel - this.alturaCompacta);
    const base = this.aberto() ? 0 : fechado;
    const y = Math.max(0, Math.min(fechado, base + this.deslocamento()));
    return `${y}px`;
  }
}
