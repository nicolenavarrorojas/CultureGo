import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonToast } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, checkmarkCircleOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, IonToast],
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.scss'],
})
export class RecuperarPasswordComponent {
  email = '';
  cargando = false;
  correoEnviado = false;

  toastMensaje = '';
  mostrarToast = false;

  constructor(private authService: Auth) {
    addIcons({ mailOutline, checkmarkCircleOutline });
  }

  get formularioValido(): boolean {
    return this.email.trim().length > 0;
  }

  async enviarCorreo() {
    if (!this.formularioValido || this.cargando) return;

    this.cargando = true;
    try {
      await this.authService.recuperarPassword(this.email.trim());
      this.correoEnviado = true;
    } catch (error) {
      this.toastMensaje = traducirErrorAuth(error);
      this.mostrarToast = true;
    } finally {
      this.cargando = false;
    }
  }
}