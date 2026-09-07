import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTitle,
  IonContent,
  IonFooter,
  IonIcon,
  IonModal,
  IonToast,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  eyeOffOutline,
  locationOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  informationCircleOutline,
  documentTextOutline,
  personOutline,
  lockClosedOutline,
  trashOutline,
  closeOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { traducirErrorAuth } from 'src/app/core/utils/traducir-error-auth';
import { Usuario } from 'src/app/core/models';

const VERSION_APP = '0.8';
const LARGO_MINIMO_PASSWORD = 6;

type EstadoPermisoUbicacion = 'granted' | 'denied' | 'prompt' | 'no_disponible';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonTitle,
    IonContent,
    IonFooter,
    IonIcon,
    IonModal,
    IonToast,
  ],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss'],
})
export class ConfiguracionComponent implements OnInit {
  usuario: Usuario | null = null;

  // Qué modal está abierto (cada opción de la lista abre el suyo)
  mostrarModalPerfil = false;
  mostrarModalPassword = false;
  mostrarModalPermisos = false;
  mostrarModalAcercaDe = false;
  mostrarModalTerminos = false;

  nombreEditado = '';
  guardandoPerfil = false;

  passwordNueva = '';
  passwordConfirmar = '';
  mostrarPasswordNueva = false;
  mostrarPasswordConfirmar = false;
  cambiandoPassword = false;

  estadoPermisoUbicacion: EstadoPermisoUbicacion = 'prompt';

  eliminandoCuenta = false;

  toastMensaje = '';
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  mostrarToast = false;

  readonly version = VERSION_APP;

  constructor(
    private authService: Auth,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      eyeOutline,
      eyeOffOutline,
      locationOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      informationCircleOutline,
      documentTextOutline,
      personOutline,
      lockClosedOutline,
      trashOutline,
      closeOutline,
      chevronForwardOutline,
    });
  }

  async ngOnInit() {
    this.usuario = await this.authService.obtenerUsuarioActual();
    this.nombreEditado = this.usuario?.nombre ?? '';
  }

  // Abrir cada modal

  abrirModalPerfil() {
    this.nombreEditado = this.usuario?.nombre ?? '';
    this.mostrarModalPerfil = true;
  }

  abrirModalPassword() {
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.mostrarModalPassword = true;
  }

  async abrirModalPermisos() {
    await this.revisarPermisoUbicacion();
    this.mostrarModalPermisos = true;
  }

  abrirModalAcercaDe() {
    this.mostrarModalAcercaDe = true;
  }

  abrirModalTerminos() {
    this.mostrarModalTerminos = true;
  }

  // Permisos

  private async revisarPermisoUbicacion() {
    if (!('permissions' in navigator)) {
      this.estadoPermisoUbicacion = 'no_disponible';
      return;
    }
    try {
      const resultado = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });
      this.estadoPermisoUbicacion = resultado.state as EstadoPermisoUbicacion;
      resultado.onchange = () => {
        this.estadoPermisoUbicacion = resultado.state as EstadoPermisoUbicacion;
      };
    } catch {
      this.estadoPermisoUbicacion = 'no_disponible';
    }
  }

  solicitarPermisoUbicacion() {
    navigator.geolocation.getCurrentPosition(
      () => this.revisarPermisoUbicacion(),
      () => this.revisarPermisoUbicacion()
    );
  }

  // Editar perfil

  get nombreValido(): boolean {
    return this.nombreEditado.trim().length > 0;
  }

  async guardarPerfil() {
    if (!this.nombreValido || this.guardandoPerfil) return;

    this.guardandoPerfil = true;
    try {
      const actualizado = await this.authService.actualizarPerfil({
        nombre: this.nombreEditado.trim(),
      });
      this.usuario = actualizado;
      this.mostrarModalPerfil = false;
      this.mostrarAviso('Perfil actualizado.', 'success');
    } catch {
      this.mostrarAviso('No se pudo actualizar el perfil. Intenta de nuevo.', 'danger');
    } finally {
      this.guardandoPerfil = false;
    }
  }

  // Cambiar contraseña

  get erroresPassword(): string | null {
    if (this.passwordNueva && this.passwordNueva.length < LARGO_MINIMO_PASSWORD) {
      return `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
    }
    if (this.passwordConfirmar && this.passwordNueva !== this.passwordConfirmar) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }

  get passwordValida(): boolean {
    return (
      this.passwordNueva.length >= LARGO_MINIMO_PASSWORD &&
      this.passwordNueva === this.passwordConfirmar
    );
  }

  toggleMostrarPasswordNueva() {
    this.mostrarPasswordNueva = !this.mostrarPasswordNueva;
  }

  toggleMostrarPasswordConfirmar() {
    this.mostrarPasswordConfirmar = !this.mostrarPasswordConfirmar;
  }

  async cambiarPassword() {
    if (!this.passwordValida || this.cambiandoPassword) return;

    this.cambiandoPassword = true;
    try {
      await this.authService.actualizarPassword(this.passwordNueva);
      this.mostrarModalPassword = false;
      this.mostrarAviso('Contraseña actualizada.', 'success');
      this.passwordNueva = '';
      this.passwordConfirmar = '';
    } catch (error) {
      this.mostrarAviso(traducirErrorAuth(error), 'danger');
    } finally {
      this.cambiandoPassword = false;
    }
  }

  // Eliminar cuenta -- acción directa con alerta de confirmación, no necesita modal propio

  async confirmarEliminarCuenta() {
    const alerta = await this.alertController.create({
      header: 'Eliminar cuenta',
      message:
        'Esta acción es permanente: se borran tus visitas, medallas, reseñas, reportes y sugerencias. No se puede deshacer. ¿Quieres continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar mi cuenta',
          role: 'destructive',
          cssClass: 'boton-alerta-eliminar',
          handler: () => this.eliminarCuenta(),
        },
      ],
    });
    await alerta.present();
  }

  private async eliminarCuenta() {
    this.eliminandoCuenta = true;
    try {
      await this.authService.eliminarCuenta();
      this.router.navigateByUrl('/tabs/inicio');
    } catch {
      this.mostrarAviso('No se pudo eliminar la cuenta. Intenta de nuevo.', 'danger');
    } finally {
      this.eliminandoCuenta = false;
    }
  }

  private mostrarAviso(mensaje: string, color: 'success' | 'warning' | 'danger') {
    this.toastMensaje = mensaje;
    this.toastColor = color;
    this.mostrarToast = true;
  }
}