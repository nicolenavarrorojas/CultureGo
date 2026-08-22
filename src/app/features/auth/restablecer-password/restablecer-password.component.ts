import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonToast } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';

const LARGO_MINIMO_PASSWORD = 6;

@Component({
  selector: 'app-restablecer-password',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonToast],
  templateUrl: './restablecer-password.component.html',
  styleUrls: ['./restablecer-password.component.scss'],
})
export class RestablecerPasswordComponent {
  password = '';
  confirmarPassword = '';
  mostrarPassword = false;
  mostrarConfirmarPassword = false;

  cargando = false;
  toastMensaje = '';
  mostrarToast = false;

  constructor(private authService: Auth, private router: Router) {
    addIcons({ lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  get formularioValido(): boolean {
    return (
      this.password.length >= LARGO_MINIMO_PASSWORD &&
      this.password === this.confirmarPassword
    );
  }

  get erroresVisibles(): string | null {
    if (this.password && this.password.length < LARGO_MINIMO_PASSWORD) {
      return `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
    }
    if (this.confirmarPassword && this.password !== this.confirmarPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }

  async guardarNuevaPassword() {
    if (!this.formularioValido || this.cargando) return;

    this.cargando = true;
    try {
      await this.authService.actualizarPassword(this.password);
      this.router.navigateByUrl('/tabs/inicio');
    } catch (error) {
      this.toastMensaje = traducirErrorAuth(error);
      this.mostrarToast = true;
    } finally {
      this.cargando = false;
    }
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleMostrarConfirmarPassword() {
    this.mostrarConfirmarPassword = !this.mostrarConfirmarPassword;
  }
}