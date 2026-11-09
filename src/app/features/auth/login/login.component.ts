import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, alertCircleOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, IonToast],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  mostrarPassword = false;

  cargando = false;
  errorMensaje = '';
  mostrarError = false;

  constructor(private authService: Auth, private router: Router, private route: ActivatedRoute) {
    addIcons({ mailOutline, lockClosedOutline, alertCircleOutline, eyeOutline, eyeOffOutline });
  }

  get formularioValido(): boolean {
    return this.email.trim().length > 0 && this.password.length > 0;
  }

  async iniciarSesion() {
    if (!this.formularioValido || this.cargando) return;

    this.cargando = true;
    try {
      await this.authService.iniciarSesion(this.email.trim(), this.password);
      this.router.navigateByUrl(this.obtenerRedirectTo() ?? '/tabs/inicio');
    } catch (error) {
      if (this.correoSinConfirmar(error)) {
        this.router.navigate(['/auth/registro'], { queryParams: { confirmar: this.email.trim() } });
      } else {
        this.mostrarAviso(traducirErrorAuth(error));
      }
    } finally {
      this.cargando = false;
    }
  }

  explorarSinCuenta() {
    this.router.navigateByUrl('/tabs/inicio');
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }
  
  private correoSinConfirmar(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const { code, message } = error as { code?: string; message?: string };
    return code === 'email_not_confirmed' || /email not confirmed/i.test(message ?? '');
  }

  private obtenerRedirectTo(): string | null {
    const destino = this.route.snapshot.queryParamMap.get('redirectTo');
    return destino && destino.startsWith('/') ? destino : null;
  }

  private mostrarAviso(mensaje: string) {
    this.errorMensaje = mensaje;
    this.mostrarError = true;
  }
}