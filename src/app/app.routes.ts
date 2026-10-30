import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { CadastroComponent } from './features/auth/cadastro/cadastro.component';
import { ShellComponent } from './layout/shell/shell.component';
import { MusicaListaComponent } from './features/musicas/musica-lista/musica-lista.component';
import { PlaylistListaComponent } from './features/playlists/playlist-lista/playlist-lista.component';
import { PlaylistDetalheComponent } from './features/playlists/playlist-detalhe/playlist-detalhe.component';
import { DependentesComponent } from './features/familia/dependentes/dependentes.component';
import { HistoricoComponent } from './features/familia/historico/historico.component';
import { RestricoesComponent } from './features/familia/restricoes/restricoes.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'cadastro', component: CadastroComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'musicas', pathMatch: 'full' },
      { path: 'musicas', component: MusicaListaComponent },
      { path: 'playlists', component: PlaylistListaComponent },
      { path: 'playlists/:playlistId', component: PlaylistDetalheComponent },
      { path: 'familia', component: DependentesComponent },
      { path: 'familia/:contaFilhaId/historico', component: HistoricoComponent },
      { path: 'familia/:contaFilhaId/restricoes', component: RestricoesComponent }
    ]
  },
  { path: '**', redirectTo: 'musicas' }
];
