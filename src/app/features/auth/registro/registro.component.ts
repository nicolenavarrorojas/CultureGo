import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, personOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';

const LARGO_MINIMO_PASSWORD = 6; 

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, IonToast],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss'],
})
export class RegistroComponent {
  nombre = '';
  email = '';
  password = '';
  confirmarPassword = '';
  mostrarPassword = false;
  mostrarConfirmarPassword = false;

  cargando = false;
  toastMensaje = '';
  toastColor: 'success' | 'danger' | 'warning' = 'danger';
  mostrarToast = false;

  constructor(private authService: Auth, private router: Router) {
    addIcons({ mailOutline, lockClosedOutline, personOutline, eyeOutline, eyeOffOutline });
  }

  get formularioValido(): boolean {
    return (
      this.nombre.trim().length > 0 &&
      this.email.trim().length > 0 &&
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

  async registrarse() {
    if (!this.formularioValido || this.cargando) return;

    this.cargando = true;
    try {
      const resultado = await this.authService.registrarse(
        this.email.trim(),
        this.password,
        this.nombre.trim()
      );


      if (resultado.session) {
        this.router.navigateByUrl('/tabs/inicio');
      } else {
        this.mostrarAviso(
          'Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.',
          'success'
        );
        setTimeout(() => this.router.navigateByUrl('/auth/login'), 2500);
      }
    } catch (error) {
      this.mostrarAviso(traducirErrorAuth(error), 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private mostrarAviso(mensaje: string, color: 'success' | 'danger' | 'warning') {
    this.toastMensaje = mensaje;
    this.toastColor = color;
    this.mostrarToast = true;
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleMostrarConfirmarPassword() {
    this.mostrarConfirmarPassword = !this.mostrarConfirmarPassword;
  }
}