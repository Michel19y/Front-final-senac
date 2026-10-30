import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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
    this.contaFilhaId = Number(this.route.snapshot.paramMap.get('contaFilhaId'));

    this.familiaService.listarHistorico(this.responsavelId, this.contaFilhaId).subscribe({
      next: (historico) => this.historico.set(historico),
      error: () => this.erro.set('Não foi possível carregar o histórico.')
    });
  }
}
