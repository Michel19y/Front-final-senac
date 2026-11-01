import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { MusicaService } from '../../../core/services/musica.service';
import { Musica } from '../../../core/models/models';
import { PlayerService } from '../../../core/services/player.service';

const POR_PAGINA = 25;

/** Minúsculas e sem acento, para "coração" achar "Coração" e "Coracao". */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * O artista principal: o que vem antes da primeira vírgula.
 *
 * Os arquivos vêm creditados como "BK, JXNV$, Gigantes", então usar a
 * string inteira criava um grupo por combinação de participantes — 21
 * cabeçalhos para 25 faixas, o que é pior que não agrupar.
 */
function artistaPrincipal(musica: Musica): string {
  const bruto = (musica.artista || '').split(',')[0].trim();
  return bruto || 'Artista desconhecido';
}

/** Primeira letra do artista para o índice. Número ou símbolo cai em "#". */
function inicial(musica: Musica): string {
  const base = normalizar(artistaPrincipal(musica) || musica.titulo || '');
  const c = base.charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

@Component({
  selector: 'app-musica-lista',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './musica-lista.component.html',
  styleUrl: './musica-lista.component.scss'
})
export class MusicaListaComponent implements OnInit {
  readonly todas = signal<Musica[]>([]);
  readonly recentes = signal<Musica[]>([]);
  readonly termo = signal('');
  readonly letra = signal<string | null>(null);
  readonly soExplicitas = signal(false);
  readonly pagina = signal(1);

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  /**
   * Filtro no cliente, não na API.
   *
   * A lista já vem filtrada pelo servidor com as restrições da conta, então
   * refinar aqui é seguro — e instantâneo, sem ida ao Supabase a cada tecla.
   */
  readonly filtradas = computed(() => {
    const t = normalizar(this.termo().trim());
    const l = this.letra();
    const soE = this.soExplicitas();

    const resultado = this.todas().filter(m => {
      if (soE && !m.explicito) return false;
      if (l && inicial(m) !== l) return false;
      if (!t) return true;
      return normalizar(m.titulo).includes(t) ||
             normalizar(m.artista ?? '').includes(t);
    });

    // Ordena por artista e depois por título: o índice é por inicial de
    // artista, e uma lista ordenada por título deixaria o índice sem
    // sentido — clicar em "B" devolveria títulos de qualquer letra.
    return resultado.sort((a, b) => {
      const pa = normalizar(artistaPrincipal(a));
      const pb = normalizar(artistaPrincipal(b));
      return pa === pb
        ? normalizar(a.titulo).localeCompare(normalizar(b.titulo))
        : pa.localeCompare(pb);
    });
  });

  /** Só as letras que têm música: índice com letra morta é ruído. */
  readonly letras = computed(() => {
    const vistas = new Set<string>();
    for (const m of this.todas()) {
      vistas.add(inicial(m));
    }
    return [...vistas].sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtradas().length / POR_PAGINA)));

  readonly visiveis = computed(() => {
    const inicio = (this.pagina() - 1) * POR_PAGINA;
    return this.filtradas().slice(inicio, inicio + POR_PAGINA);
  });

  /**
   * Agrupa as visíveis por artista. Em 317 faixas, uma lista corrida não
   * dá referência nenhuma de onde você está; o cabeçalho fixo dá.
   */
  readonly grupos = computed(() => {
    const saida: { artista: string; faixas: Musica[] }[] = [];
    for (const m of this.visiveis()) {
      const nome = artistaPrincipal(m);
      const ultimo = saida[saida.length - 1];
      if (ultimo && ultimo.artista === nome) {
        ultimo.faixas.push(m);
      } else {
        saida.push({ artista: nome, faixas: [m] });
      }
    }
    return saida;
  });

  readonly explicitas = computed(() => this.todas().filter(m => m.explicito).length);

  readonly temFiltro = computed(() =>
    !!this.termo().trim() || this.letra() !== null || this.soExplicitas());

  private get usuarioId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    private readonly authService: AuthService,
    private readonly musicaService: MusicaService,
    readonly player: PlayerService
  ) {
    // Mudou o filtro, volta pra primeira página — senão você fica numa
    // página 9 que não existe mais no resultado novo.
    effect(() => {
      this.termo(); this.letra(); this.soExplicitas();
      this.pagina.set(1);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.carregar();
    this.carregarRecentes();
  }

  carregarRecentes(): void {
    this.musicaService.recentes(this.usuarioId).subscribe({
      // Recentes é um complemento: se falhar, a tela continua útil.
      next: (m) => this.recentes.set(m),
      error: () => this.recentes.set([])
    });
  }

  carregar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.musicaService.listar(this.usuarioId).subscribe({
      next: (musicas) => {
        this.carregando.set(false);
        this.todas.set(musicas);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar as músicas.');
      }
    });
  }

  /** Artista principal, para o cabeçalho de grupo. */
  principalDe(musica: Musica): string {
    return artistaPrincipal(musica);
  }

  /** Inicial mostrada no lugar da capa quando a faixa não tem arte. */
  inicialDe(musica: Musica): string {
    return inicial(musica);
  }

  ehAtual(musica: Musica): boolean {
    return this.player.faixa()?.id === musica.id;
  }

  /** O que o leitor de tela anuncia: a linha toda virou um botão. */
  rotuloDe(musica: Musica): string {
    const nome = `${musica.titulo}, ${musica.artista || 'artista desconhecido'}`;
    if (this.player.pedindoId() === musica.id) {
      return `Abrindo ${nome}`;
    }
    if (this.ehAtual(musica)) {
      return this.player.tocando() ? `Pausar ${nome}` : `Retomar ${nome}`;
    }
    return `Tocar ${nome}`;
  }

  escolherLetra(l: string | null): void {
    this.letra.set(this.letra() === l ? null : l);
  }

  limparFiltros(): void {
    this.termo.set('');
    this.letra.set(null);
    this.soExplicitas.set(false);
  }

  irPara(p: number): void {
    this.pagina.set(Math.max(1, Math.min(p, this.totalPaginas())));
    // Volta ao topo: trocar de página e continuar no meio da lista desorienta.
    document.querySelector('.conteudo')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Passa a lista filtrada como contexto: é dela que vêm "próxima" e
   *  "anterior" no player. Toda a orquestração mora no PlayerService. */
  reproduzir(musica: Musica): void {
    this.player.pedirParaTocar(musica, this.filtradas());
  }
}
