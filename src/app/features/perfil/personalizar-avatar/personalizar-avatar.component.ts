import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonToast,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, giftOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { AvatarService } from 'src/app/core/services/avatar';
import { AvatarPreviewComponent } from 'src/app/shared/components/avatar-preview/avatar-preview.component';
import { ConfiguracionAvatar, ParteAvatar } from 'src/app/core/models';

// Orden de arriba hacia abajo de los controles.
const PARTES: { clave: ParteAvatar; etiqueta: string }[] = [
  { clave: 'cabeza', etiqueta: 'Cabeza' },
  { clave: 'ojos', etiqueta: 'Ojos' },
  { clave: 'boca', etiqueta: 'Boca' },
  { clave: 'cuerpo', etiqueta: 'Cuerpo' },
];

// Cantidad de piezas disponibles por parte (archivos <parte>-1.png ... <parte>-N.png).
const CANTIDAD_POR_PARTE: Record<ParteAvatar, number> = {
  cabeza: 10,
  ojos: 9,
  boca: 10,
  cuerpo: 6,
};

const PERMITE_NINGUNO: Record<ParteAvatar, boolean> = {
  cabeza: true,
  ojos: false,
  boca: false,
  cuerpo: true,
};

// Avatar por defecto: con ojos y boca predefinidos.
const INDICES_INICIALES: Record<ParteAvatar, number> = {
  cabeza: 0,
  ojos: 2,
  boca: 6,
  cuerpo: 0,
};

@Component({
  selector: 'app-personalizar-avatar',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonIcon,
    IonToast,
    AvatarPreviewComponent,
  ],
  templateUrl: './personalizar-avatar.component.html',
  styleUrls: ['./personalizar-avatar.component.scss'],
})
export class PersonalizarAvatarComponent implements OnInit {
  partes = PARTES;

  indices: ConfiguracionAvatar = { ...INDICES_INICIALES };

  toastMensaje = '';
  mostrarToast = false;
  guardando = false;

  private idUsuario: string | null = null;

  constructor(
    private authService: Auth,
    private avatarService: AvatarService,
    private location: Location,
    private alertController: AlertController
  ) {
    addIcons({ chevronBackOutline, chevronForwardOutline, giftOutline });
  }

  async ngOnInit() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.idUsuario = usuario?.id_usuario ?? null;
    if (!this.idUsuario) return;

    this.cargarCacheLocal();
    this.normalizarIndices();

    try {
      this.indices = await this.avatarService.obtenerConfiguracion(this.idUsuario);
      this.normalizarIndices();
      this.guardarCacheLocal();
    } catch {
      // Sin conexión o error de lectura: se mantiene lo que había en caché local.
    }
  }

  /** si ojos/boca quedaron en 0, los sube a la primera opción real (1) para que nadie se
   * quede con una cara sin ojos ni boca. */
  private normalizarIndices() {
    (Object.keys(PERMITE_NINGUNO) as ParteAvatar[]).forEach((parte) => {
      if (!PERMITE_NINGUNO[parte] && this.indices[parte] === 0) {
        this.indices[parte] = 1;
      }
    });
  }


  cambiarPaso(parte: ParteAvatar, direccion: 1 | -1) {
    const cantidad = CANTIDAD_POR_PARTE[parte];
    const minimo = PERMITE_NINGUNO[parte] ? 0 : 1;
    const total = cantidad - minimo + 1;
    const posicionActual = this.indices[parte] - minimo;
    this.indices[parte] = ((posicionActual + direccion + total) % total) + minimo;
  }

  async guardar() {
    if (!this.idUsuario || this.guardando) return;

    this.guardando = true;
    try {
      await this.avatarService.guardarConfiguracion(this.idUsuario, this.indices);
      this.guardarCacheLocal();
      this.mostrarAviso('Avatar guardado');
    } catch (error) {
      this.mostrarAviso(this.traducirErrorAvatar(error));
    } finally {
      this.guardando = false;
    }
  }

  async restablecer() {
    const alerta = await this.alertController.create({
      header: 'Restablecer avatar',
      message: 'Vas a volver a la configuración original. ¿Quieres continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restablecer',
          role: 'destructive',
          cssClass: 'boton-alerta-eliminar',
          handler: () => this.confirmarRestablecer(),
        },
      ],
    });
    await alerta.present();
  }

  private confirmarRestablecer() {
    this.indices = { ...INDICES_INICIALES };
    this.mostrarAviso('Avatar restablecido');
  }

  volver() {
    this.location.back();
  }

  private cargarCacheLocal() {
    if (!this.idUsuario) return;
    const guardado = localStorage.getItem(this.claveAlmacenamiento(this.idUsuario));
    if (!guardado) return;
    try {
      this.indices = JSON.parse(guardado);
    } catch {
    }
  }

  private guardarCacheLocal() {
    if (!this.idUsuario) return;
    localStorage.setItem(this.claveAlmacenamiento(this.idUsuario), JSON.stringify(this.indices));
  }

  private claveAlmacenamiento(idUsuario: string): string {
    return `culturego-avatar-${idUsuario}`;
  }

  private traducirErrorAvatar(error: unknown): string {
    const mensaje =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

    return mensaje
      ? 'No se pudo guardar el avatar. Intenta de nuevo.'
      : 'No se pudo guardar el avatar. Revisa tu conexión e intenta de nuevo.';
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}