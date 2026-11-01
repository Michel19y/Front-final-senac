import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { MusicaService } from '../../../core/services/musica.service';

/** Teto por arquivo no bucket. Acima disso o Storage devolve 413. */
const LIMITE_ARQUIVO = 50 * 1024 * 1024;

/** Espaço total do plano free do Supabase, para avisar antes de tentar. */
const COTA_TOTAL = 1024 * 1024 * 1024;

const TIPOS = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav'];

type Situacao = 'aguardando' | 'enviando' | 'pronta' | 'falhou' | 'ignorada';

interface ItemFila {
  /** Identidade estável. A fila é atualizada de forma imutável (cada mudança
   *  gera um objeto novo), então comparar por referência perde o item. */
  id: number;
  arquivo: File;
  titulo: string;
  artista: string;
  explicito: boolean;
  situacao: Situacao;
  progresso: number;
  motivo?: string;
}

/** "Artista - Título.mp3" → as duas partes. Sem o traço, vira só título. */
function separar(nomeArquivo: string): { artista: string; titulo: string } {
  const base = nomeArquivo.replace(/\.[^.]+$/, '');
  const i = base.indexOf(' - ');
  if (i <= 0) {
    return { artista: '', titulo: base.trim() };
  }
  return { artista: base.slice(0, i).trim(), titulo: base.slice(i + 3).trim() };
}

@Component({
  selector: 'app-musica-nova',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './musica-nova.component.html',
  styleUrl: './musica-nova.component.scss'
})
export class MusicaNovaComponent {
  readonly fila = signal<ItemFila[]>([]);
  readonly enviando = signal(false);
  readonly cancelado = signal(false);
  readonly erro = signal<string | null>(null);

  private proximoId = 1;

  private readonly musicaService = inject(MusicaService);
  private readonly router = inject(Router);

  readonly aguardando = computed(() => this.fila().filter(i => i.situacao === 'aguardando').length);
  readonly prontas = computed(() => this.fila().filter(i => i.situacao === 'pronta').length);
  readonly falhas = computed(() => this.fila().filter(i => i.situacao === 'falhou').length);
  readonly ignoradas = computed(() => this.fila().filter(i => i.situacao === 'ignorada').length);

  readonly bytesEnviaveis = computed(() =>
    this.fila()
      .filter(i => i.situacao === 'aguardando' || i.situacao === 'enviando')
      .reduce((t, i) => t + i.arquivo.size, 0));

  readonly passaDaCota = computed(() => this.bytesEnviaveis() > COTA_TOTAL);

  readonly podeEnviar = computed(() =>
    !this.enviando() && this.fila().some(i => i.situacao === 'aguardando' && this.itemValido(i)));

  aoEscolher(evento: Event): void {
    this.erro.set(null);
    const entrada = evento.target as HTMLInputElement;
    const escolhidos = Array.from(entrada.files ?? []);
    if (!escolhidos.length) {
      return;
    }

    const jaNaFila = new Set(this.fila().map(i => `${i.arquivo.name}|${i.arquivo.size}`));
    const novos: ItemFila[] = [];

    for (const arquivo of escolhidos) {
      const chave = `${arquivo.name}|${arquivo.size}`;
      if (jaNaFila.has(chave)) {
        continue; // mesma seleção duas vezes não duplica
      }
      jaNaFila.add(chave);

      const { artista, titulo } = separar(arquivo.name);
      const item: ItemFila = {
        id: this.proximoId++,
        arquivo, titulo, artista, explicito: false,
        situacao: 'aguardando', progresso: 0,
      };

      // Recusa aqui o que o servidor recusaria, para não gastar upload à toa.
      const tipoOk = TIPOS.includes(arquivo.type) ||
        (!arquivo.type && /\.(mp3|m4a|aac|ogg|wav)$/i.test(arquivo.name));
      if (!tipoOk) {
        item.situacao = 'ignorada';
        item.motivo = 'não é áudio';
      } else if (arquivo.size > LIMITE_ARQUIVO) {
        item.situacao = 'ignorada';
        item.motivo = `${this.tamanho(arquivo.size)} — acima de 50 MB`;
      }
      novos.push(item);
    }

    this.fila.update(f => [...f, ...novos]);
    entrada.value = ''; // permite escolher a mesma pasta de novo
  }

  itemValido(i: ItemFila): boolean {
    return i.titulo.trim().length >= 2 && i.artista.trim().length >= 2;
  }

  remover(item: ItemFila): void {
    this.fila.update(f => f.filter(i => i.id !== item.id));
  }

  limpar(): void {
    this.fila.set([]);
    this.erro.set(null);
    this.cancelado.set(false);
  }

  parar(): void {
    this.cancelado.set(true);
  }

  /**
   * Envia um de cada vez, de propósito.
   *
   * Em paralelo, 50 uploads simultâneos estouram a conexão e o Storage
   * começa a recusar; sequencial é mais lento mas termina.
   */
  async enviarTodos(): Promise<void> {
    if (this.enviando()) {
      return;
    }
    this.erro.set(null);
    this.cancelado.set(false);
    this.enviando.set(true);

    // Percorre ids, nao objetos: a fila e recriada a cada atualizacao, e
    // guardar a referencia antiga faria o item sumir do meio do caminho.
    const ids = this.fila().map(i => i.id);

    for (const id of ids) {
      if (this.cancelado()) {
        break;
      }
      const item = this.fila().find(i => i.id === id);
      if (!item || item.situacao !== 'aguardando') {
        continue;
      }
      if (!this.itemValido(item)) {
        this.atualizar(id, { situacao: 'ignorada', motivo: 'preencha título e artista' });
        continue;
      }
      await this.enviarUm(id);
    }

    this.enviando.set(false);
  }

  private enviarUm(id: number): Promise<void> {
    const item = this.fila().find(i => i.id === id)!;
    return new Promise(resolve => {
      this.atualizar(id, { situacao: 'enviando', progresso: 0 });

      const dados = new FormData();
      dados.append('arquivo', item.arquivo, item.arquivo.name);
      dados.append('titulo', item.titulo.trim());
      dados.append('artista', item.artista.trim());
      dados.append('explicito', String(item.explicito));

      this.musicaService.enviar(dados).subscribe({
        next: evento => {
          if (evento.type === HttpEventType.UploadProgress && evento.total) {
            this.atualizar(id, { progresso: Math.round((evento.loaded / evento.total) * 100) });
          } else if (evento.type === HttpEventType.Response) {
            this.atualizar(id, { situacao: 'pronta', progresso: 100 });
            resolve();
          }
        },
        error: (e: HttpErrorResponse) => {
          // Uma falha não para a fila: marca e segue para a próxima.
          this.atualizar(id, {
            situacao: 'falhou',
            progresso: 0,
            motivo: e.error?.erro ?? 'falha no envio',
          });
          resolve();
        }
      });
    });
  }

  private atualizar(id: number, mudanca: Partial<ItemFila>): void {
    this.fila.update(f => f.map(i => (i.id === id ? { ...i, ...mudanca } : i)));
  }

  irParaMusicas(): void {
    this.router.navigate(['/musicas']);
  }

  tamanho(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}
