import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  readonly usuario;

  constructor(private readonly authService: AuthService, private readonly router: Router) {
    this.usuario = this.authService.usuario;
  }

  sair(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
