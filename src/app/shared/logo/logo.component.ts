import { Component, input } from '@angular/core';

/**
 * Marca do Spotifei Família.
 *
 * SVG embutido, e não <img src="logo.svg">, por dois motivos: as cores vêm
 * das variáveis do tema (muda a paleta, muda a logo junto) e não há uma
 * requisição a mais só para desenhar um ícone.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg viewBox="0 0 64 64" [attr.width]="tamanho()" [attr.height]="tamanho()"
         role="img" aria-label="Spotifei Família">
      <rect width="64" height="64" rx="15"
            [attr.fill]="solida() ? 'var(--chassi)' : 'var(--ambar)'" />
      <g [attr.fill]="solida() ? 'var(--ambar)' : 'var(--chassi)'">
        <rect x="11" y="26" width="6" height="12" rx="3" />
        <rect x="21" y="19" width="6" height="26" rx="3" />
        <rect x="31" y="10" width="6" height="44" rx="3" />
        <rect x="41" y="22" width="6" height="20" rx="3" />
        <rect x="51" y="28" width="6" height="8" rx="3" />
      </g>
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex-shrink: 0; }
    svg { display: block; }
  `
})
export class LogoComponent {
  readonly tamanho = input<number>(32);
  /** Inverte: chassi escuro com onda âmbar. Para fundo claro. */
  readonly solida = input<boolean>(false);
}
