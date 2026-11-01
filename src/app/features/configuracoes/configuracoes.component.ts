import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PlayerService } from '../../core/services/player.service';

/** Teto do bucket de perfis no Supabase. */
const LIMITE_FOTO = 3 * 1024 * 1024;

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss'
})
export class ConfiguracoesComponent implements OnInit {
  readonly nome = signal('');
  readonly enviandoFoto = signal(false);
  readonly progresso = signal(0);
  readonly salvandoNome = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  /** Prévia local enquanto a foto não subiu: resposta imediata ao clique. */
  readonly previa = signal<string | null>(null);

  private relogioAviso?: ReturnType<typeof setTimeout>;

  private readonly auth = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  readonly player = inject(PlayerService);

  readonly usuario = this.auth.usuario;

  readonly foto = computed(() => this.previa() ?? this.usuario()?.foto ?? null);

  readonly inicial = computed(() =>
    (this.usuario()?.nomeUsuario || '?').trim().charAt(0).toUpperCase());

  readonly nomeMudou = computed(() => {
    const atual = (this.usuario()?.nomeUsuario ?? '').trim();
    return this.nome().trim() !== atual && this.nome().trim().length >= 2;
  });

  ngOnInit(): void {
    this.nome.set(this.usuario()?.nomeUsuario ?? '');
  }

  salvarNome(): void {
    const id = this.usuario()?.id;
    if (!id || !this.nomeMudou() || this.salvandoNome()) {
      return;
    }

    this.erro.set(null);
    this.aviso.set(null);
    this.salvandoNome.set(true);

    this.perfilService.alterarNome(id, this.nome().trim()).subscribe({
      next: (u) => {
        this.salvandoNome.set(false);
        this.auth.atualizarUsuario(u);
        this.avisar('Nome atualizado.');
      },
      error: (e: HttpErrorResponse) => {
        this.salvandoNome.set(false);
        this.erro.set(e.error?.erro ?? 'Não foi possível salvar o nome.');
      }
    });
  }

  private readonly campoArquivo = viewChild<ElementRef<HTMLInputElement>>('arquivo');
  private readonly visor = viewChild<ElementRef<HTMLDialogElement>>('visor');

  /**
   * Com foto, o toque abre o visor; sem foto, não há o que mostrar e o
   * gesto natural é escolher uma.
   */
  aoClicarNoAvatar(): void {
    if (this.enviandoFoto()) {
      return;
    }
    if (this.foto()) {
      this.visor()?.nativeElement.showModal();
    } else {
      this.escolherArquivo();
    }
  }

  escolherArquivo(): void {
    this.campoArquivo()?.nativeElement.click();
  }

  /** Fecha o visor antes de abrir o seletor: o diálogo cobriria a resposta. */
  trocarPeloVisor(): void {
    this.fecharFoto();
    this.escolherArquivo();
  }

  fecharFoto(): void {
    const el = this.visor()?.nativeElement;
    if (el?.open) {
      el.close();
    }
  }

  aoClicarNoFundo(evento: MouseEvent): void {
    if (evento.target === this.visor()?.nativeElement) {
      this.fecharFoto();
    }
  }

  aoEscolherFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = ''; // permite reenviar o mesmo arquivo depois
    if (!arquivo) {
      return;
    }

    this.erro.set(null);
    this.aviso.set(null);

    const tipoOk = TIPOS.includes(arquivo.type) ||
      (!arquivo.type && /\.(jpe?g|png|webp|gif)$/i.test(arquivo.name));
    if (!tipoOk) {
      this.erro.set('Esse arquivo não é imagem. Envie JPG, PNG, WEBP ou GIF.');
      return;
    }
    if (arquivo.size > LIMITE_FOTO) {
      this.erro.set(`A imagem tem ${this.tamanho(arquivo.size)}. O limite é 3 MB.`);
      return;
    }

    // Mostra na hora, antes do upload terminar. Se falhar, a prévia some.
    const leitor = new FileReader();
    leitor.onload = () => this.previa.set(String(leitor.result));
    leitor.readAsDataURL(arquivo);

    this.enviar(arquivo);
  }

  private enviar(arquivo: File): void {
    const id = this.usuario()?.id;
    if (!id) {
      return;
    }

    const dados = new FormData();
    dados.append('foto', arquivo, arquivo.name);

    this.enviandoFoto.set(true);
    this.progresso.set(0);

    this.perfilService.enviarFoto(id, dados).subscribe({
      next: (evento) => {
        if (evento.type === HttpEventType.UploadProgress && evento.total) {
          this.progresso.set(Math.round((evento.loaded / evento.total) * 100));
        } else if (evento.type === HttpEventType.Response && evento.body) {
          this.enviandoFoto.set(false);
          this.previa.set(null);
          this.auth.atualizarUsuario(evento.body);
          this.avisar('Foto atualizada.');
        }
      },
      error: (e: HttpErrorResponse) => {
        this.enviandoFoto.set(false);
        this.progresso.set(0);
        this.previa.set(null);
        this.erro.set(e.error?.erro ?? 'Não foi possível enviar a foto.');
      }
    });
  }

  /** Confirmação some sozinha: o erro fica, porque pede ação. */
  private avisar(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.relogioAviso);
    this.relogioAviso = setTimeout(() => this.aviso.set(null), 4000);
  }

  alternarAutomatico(): void {
    this.player.alternarAutomatico();
  }

  tamanho(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
