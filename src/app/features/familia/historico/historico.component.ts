import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FamiliaService } from '../../../core/services/familia.service';
import { HistoricoItem } from '../../../core/models/models';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './historico.component.html',
  styleUrl: './historico.component.scss'
})
export class HistoricoComponent implements OnInit {
  contaFilhaId = 0;
  readonly historico = signal<HistoricoItem[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  private get responsavelId(): number {
    return this.authService.usuario()?.id ?? 0;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly familiaService: FamiliaService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.contaFilhaId = Number(params.get('contaFilhaId'));
      this.carregar();
    });
  }

  carregar(): void {
    this.erro.set(null);
    this.carregando.set(true);

    this.familiaService.listarHistorico(this.responsavelId, this.contaFilhaId).subscribe({
      next: (historico) => {
        this.carregando.set(false);
        this.historico.set(historico);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.error?.erro ?? 'Não foi possível carregar o histórico.');
      }
    });
  }
}
