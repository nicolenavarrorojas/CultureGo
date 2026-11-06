import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonToast,
  IonCheckbox,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  lockClosedOutline,
  personOutline,
  eyeOutline,
  eyeOffOutline,
  closeOutline,
} from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';
import { traducirErrorCodigo } from 'src/app/core/utils/traducir-error-codigo';
import { TerminosCondicionesComponent } from 'src/app/shared/components/terminos-condiciones/terminos-condiciones.component';
import { VerificarCodigoComponent } from 'src/app/shared/components/verificar-codigo/verificar-codigo.component';

const LARGO_MINIMO_PASSWORD = 6; 

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonToast,
    IonCheckbox,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    TerminosCondicionesComponent,
    VerificarCodigoComponent,
  ],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss'],
})
export class RegistroComponent implements OnInit {
  nombre = '';
  email = '';
  password = '';
  confirmarPassword = '';
  mostrarPassword = false;
  mostrarConfirmarPassword = false;

  aceptaTerminos = false;
  mostrarTerminos = false;

  // 'formulario': datos de la cuenta · 'codigo': ingresar el código que llegó al correo
  paso: 'formulario' | 'codigo' = 'formulario';
  cargando = false;
  verificando = false;
  toastMensaje = '';
  toastColor: 'success' | 'danger' | 'warning' = 'danger';
  mostrarToast = false;

  constructor(
    private authService: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({
      mailOutline,
      lockClosedOutline,
      personOutline,
      eyeOutline,
      eyeOffOutline,
      closeOutline,
    });
  }

  ngOnInit() {
    const correoPendiente = this.route.snapshot.queryParamMap.get('confirmar');
    if (correoPendiente) {
      this.email = correoPendiente;
      this.paso = 'codigo';
      this.reenviarCodigo();
    }
  }

  get formularioValido(): boolean {
    return (
      this.nombre.trim().length > 0 &&
      this.email.trim().length > 0 &&
      this.password.length >= LARGO_MINIMO_PASSWORD &&
      this.password === this.confirmarPassword &&
      this.aceptaTerminos
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
        this.nombre.trim(),
        this.aceptaTerminos
      );


      if (resultado.session) {
        this.router.navigateByUrl('/tabs/inicio');
        return;
      }

      if (resultado.user?.identities?.length === 0) {
        this.mostrarAviso('Este correo ya está registrado. Inicia sesión.', 'warning');
        return;
      }

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
      await this.authService.verificarCodigoRegistro(this.email.trim(), codigo);
      await this.router.navigateByUrl('/tabs/inicio');
    } catch (error) {
      this.mostrarAviso(traducirErrorCodigo(error), 'danger');
    } finally {
      this.verificando = false;
    }
  }

  async reenviarCodigo() {
    try {
      await this.authService.reenviarCodigoRegistro(this.email.trim());
      this.mostrarAviso('Te enviamos un código nuevo.', 'success');
    } catch (error) {
      this.mostrarAviso(traducirErrorCodigo(error), 'danger');
    }
  }

  volverAlFormulario() {
    this.paso = 'formulario';
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

  toggleAceptaTerminos() {
    this.aceptaTerminos = !this.aceptaTerminos;
  }

  abrirTerminos() {
    this.mostrarTerminos = true;
  }
}