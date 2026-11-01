import { Component, ElementRef, input, output, viewChild, effect } from '@angular/core';

/**
 * Diálogo de confirmação para ações destrutivas.
 *
 * Usa <dialog> nativo com showModal(): o navegador cuida sozinho do foco preso
 * dentro do diálogo, do fechamento por Esc e da camada acima de todo o resto —
 * coisas que uma div com position:fixed teria que reimplementar (mal).
 */
@Component({
  selector: 'app-confirmacao',
  standalone: true,
  templateUrl: './confirmacao.component.html',
  styleUrl: './confirmacao.component.scss'
})
export class ConfirmacaoComponent {
  /** Quando vira true, o diálogo abre. */
  readonly aberto = input.required<boolean>();
  readonly titulo = input<string>('Confirmar ação');
  readonly mensagem = input<string>('');
  /** Rótulo do botão que executa a ação — diga o que vai acontecer, não "OK". */
  readonly rotuloConfirmar = input<string>('Confirmar');
  readonly destrutivo = input<boolean>(true);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const el = this.dialogo()?.nativeElement;
      if (!el) {
        return;
      }

      if (this.aberto() && !el.open) {
        el.showModal();
      } else if (!this.aberto() && el.open) {
        el.close();
      }
    });
  }

  /** Esc e clique no backdrop disparam 'close' — ambos significam cancelar. */
  aoFechar(): void {
    if (this.aberto()) {
      this.cancelar.emit();
    }
  }

  aoClicarNoFundo(evento: MouseEvent): void {
    if (evento.target === this.dialogo()?.nativeElement) {
      this.cancelar.emit();
    }
  }
}
