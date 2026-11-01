import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PlayerBarraComponent } from '../player-barra/player-barra.component';
import { LogoComponent } from '../../shared/logo/logo.component';
import { ConfirmacaoComponent } from '../../shared/confirmacao/confirmacao.component';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PlayerService } from '../../core/services/player.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    PlayerBarraComponent, LogoComponent, ConfirmacaoComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly player = inject(PlayerService);
  private readonly router = inject(Router);

  readonly usuario = this.authService.usuario;

  /** Letra que aparece no lugar da foto enquanto não houver uma. */
  readonly inicial = computed(() =>
    (this.usuario()?.nomeUsuario || '?').trim().charAt(0).toUpperCase());

  private readonly lateral = viewChild<ElementRef<HTMLElement>>('lateral');
  private observador?: ResizeObserver;
  private readonly aoRedimensionar = () => this.medirColuna();

  /**
   * Relê o perfil do servidor ao abrir o app.
   *
   * O usuário vem do localStorage, que é uma cópia do momento do login. Sem
   * esta releitura, nome e foto trocados em outro aparelho — ou numa sessão
   * anterior à existência da foto — só apareceriam depois de sair e entrar.
   */
  ngOnInit(): void {
    const id = this.usuario()?.id;
    if (id) {
      this.perfilService.obter(id).subscribe({
        next: (u) => this.authService.atualizarUsuario(u),
        error: () => { /* offline ou sessão expirada: o interceptor já trata */ }
      });
    }

    // Com o console aberto a navegação continua clicável ao lado. Trocar de
    // tela sem recolher deixaria o clique sem resposta visível nenhuma.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.player.recolher());
  }

  ngAfterViewInit(): void {
    this.medirColuna();
    const el = this.lateral()?.nativeElement;
    if (el) {
      this.observador = new ResizeObserver(() => this.medirColuna());
      this.observador.observe(el);
    }
    window.addEventListener('resize', this.aoRedimensionar, { passive: true });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    window.removeEventListener('resize', this.aoRedimensionar);
  }

  /**
   * Diz ao player onde começa a coluna de conteúdo.
   *
   * Medido da barra lateral de verdade em vez de repetir o 232px e o
   * breakpoint no CSS do player: quando a barra passa para o topo, a mesma
   * conta já devolve deslocamento lateral zero e altura de cabeçalho.
   */
  private medirColuna(): void {
    const el = this.lateral()?.nativeElement;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const noTopo = r.width >= window.innerWidth - 1;

    const raiz = document.documentElement.style;
    raiz.setProperty('--conteudo-esquerda', `${noTopo ? 0 : Math.round(r.right)}px`);
    raiz.setProperty('--conteudo-topo', `${noTopo ? Math.round(r.height) : 0}px`);
  }

  /**
   * O "Sair" fica logo abaixo do atalho da conta e, no celular, colado na
   * navegação. Errar o alvo custa refazer login com 2FA — então pergunta.
   */
  readonly confirmandoSaida = signal(false);

  sair(): void {
    this.confirmandoSaida.set(true);
  }

  cancelarSaida(): void {
    this.confirmandoSaida.set(false);
  }

  confirmarSaida(): void {
    this.confirmandoSaida.set(false);
    // Para o áudio antes de sair: sem isso a faixa segue tocando na tela
    // de login, já sem nenhum controle à vista.
    this.player.fechar();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
