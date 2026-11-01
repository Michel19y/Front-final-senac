import { Component, ElementRef, computed, effect, inject, output } from '@angular/core';
import { PlayerService } from '../../core/services/player.service';

/**
 * Console de reprodução: o que toca à esquerda, a fila à direita.
 *
 * Não é uma tela sobre a lista — é a lista em outra forma. Quem abre o
 * player continua vendo para onde a reprodução vai e pode pular direto.
 */
@Component({
  selector: 'app-player-palco',
  standalone: true,
  templateUrl: './player-palco.component.html',
  styleUrl: './player-palco.component.scss'
})
export class PlayerPalcoComponent {
  readonly player = inject(PlayerService);

  /** Quem fecha é a barra: ela controla a animação de descida. */
  readonly sair = output<void>();

  private readonly hospedeiro = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * A capa vira o fundo da tela, borrada.
   *
   * Vai como variável CSS, e não como background-image direto: o
   * sanitizador do Angular corta url() em binding de estilo.
   */
  readonly fundo = computed(() => {
    const capa = this.player.faixa()?.capa;
    return capa ? `url("${capa}")` : null;
  });

  /**
   * Quantas faixas a fila desenha de uma vez.
   *
   * 317 linhas de uma vez eram 317 pedidos de capa e uma barra de rolagem
   * sem fim. A fila responde "o que vem agora" — para ir a uma faixa
   * qualquer existe a tela de Músicas.
   */
  private static readonly TETO = 50;

  readonly aSeguir = computed(() => this.player.proximas().slice(0, PlayerPalcoComponent.TETO));
  readonly restantes = computed(() =>
    Math.max(0, this.player.proximas().length - PlayerPalcoComponent.TETO));

  constructor() {
    // Trocou de faixa: a atual volta a ser a primeira linha, então basta
    // subir a lista. Antes era preciso caçá-la no meio de 317 itens.
    effect(() => {
      this.player.faixa();
      setTimeout(() => this.hospedeiro.nativeElement
        .querySelector<HTMLElement>('.fila ul')
        ?.scrollTo({ top: 0, behavior: 'smooth' }));
    });
  }

  aoArrastar(evento: Event): void {
    this.player.irPara(Number((evento.target as HTMLInputElement).value));
  }

  aoMudarVolume(evento: Event): void {
    this.player.definirVolume(Number((evento.target as HTMLInputElement).value));
  }
}
