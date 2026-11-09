import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonToast } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';
import { traducirErrorCodigo } from 'src/app/core/utils/traducir-error-codigo';
import { VerificarCodigoComponent } from 'src/app/shared/components/verificar-codigo/verificar-codigo.component';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, IonToast, VerificarCodigoComponent],
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.scss'],
})
export class RecuperarPasswordComponent {
  email = '';
  // 'correo': pedir el código · 'codigo': ingresarlo (luego se cambia la contraseña en /auth/restablecer)
  paso: 'correo' | 'codigo' = 'correo';
  cargando = false;
  verificando = false;

  toastMensaje = '';
  toastColor: 'danger' | 'success' = 'danger';
  mostrarToast = false;

  constructor(private authService: Auth, private router: Router) {
    addIcons({ mailOutline });
  }

  get formularioValido(): boolean {
    return this.email.trim().length > 0;
  }

  async enviarCorreo() {
    if (!this.formularioValido || this.cargando) return;

    this.cargando = true;
    try {
      await this.authService.recuperarPassword(this.email.trim());
      // Siempre se pasa al paso del código, exista o no el correo:
      // así no se revela quién tiene cuenta.
      this.paso = 'codigo';
    } catch (error) {
      this.mostrarAviso(traducirErrorAuth(error), 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async verificarCodigo(codigo: string) {
    if (this.verificando) return;

    this.verificando = true;
    try {
      await this.authService.verificarCodigoRecuperacion(this.email.trim(), codigo);
      await this.router.navigateByUrl('/auth/restablecer');
    } catch (error) {
      this.mostrarAviso(traducirErrorCodigo(error), 'danger');
    } finally {
      this.verificando = false;
    }
  }

  async reenviarCodigo() {
    try {
      await this.authService.recuperarPassword(this.email.trim());
      this.mostrarAviso('Si el correo está registrado, te enviamos un código nuevo.', 'success');
    } catch (error) {
      this.mostrarAviso(traducirErrorAuth(error), 'danger');
    }
  }

  volverAlCorreo() {
    this.paso = 'correo';
  }

  private mostrarAviso(mensaje: string, color: 'danger' | 'success') {
    this.toastMensaje = mensaje;
    this.toastColor = color;
    this.mostrarToast = true;
  }
}