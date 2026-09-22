import { Component, OnDestroy, OnInit } from '@angular/core';
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

// Avatar por defecto: sin cabeza ni cuerpo, con ojos y boca predefinidos.
const INDICES_INICIALES: Record<ParteAvatar, number> = {
  cabeza: 0,
  ojos: 2,
  boca: 6,
  cuerpo: 0,
};

const RETRASO_INICIAL_MS = 400;
const INTERVALO_CAMBIO_MS = 180;

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
export class PersonalizarAvatarComponent implements OnInit, OnDestroy {
  partes = PARTES;

  // 0 = ninguno; N = opción N de esa parte.
  indices: ConfiguracionAvatar = { ...INDICES_INICIALES };

  toastMensaje = '';
  mostrarToast = false;
  guardando = false;

  private idUsuario: string | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private intervaloId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: Auth,
    private avatarService: AvatarService,
    private location: Location
  ) {
    addIcons({ chevronBackOutline, chevronForwardOutline, giftOutline });
  }

  async ngOnInit() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.idUsuario = usuario?.id_usuario ?? null;
    if (!this.idUsuario) return;

    // Caché local: se muestra de inmediato mientras se confirma con Supabase.
    this.cargarCacheLocal();

    try {
      this.indices = await this.avatarService.obtenerConfiguracion(this.idUsuario);
      this.guardarCacheLocal();
    } catch {
      // Sin conexión o error de lectura: se mantiene lo que había en caché local.
    }
  }

  ngOnDestroy() {
    this.detenerCambioContinuo();
  }

  /** Un solo paso (tap breve). */
  cambiarPaso(parte: ParteAvatar, direccion: 1 | -1) {
    const total = CANTIDAD_POR_PARTE[parte] + 1;
    this.indices[parte] = (this.indices[parte] + direccion + total) % total;
  }

  /** Mientras se mantenga presionada la flecha, sigue avanzando. */
  iniciarCambioContinuo(parte: ParteAvatar, direccion: 1 | -1) {
    this.detenerCambioContinuo();
    this.cambiarPaso(parte, direccion);
    this.timeoutId = setTimeout(() => {
      this.intervaloId = setInterval(() => this.cambiarPaso(parte, direccion), INTERVALO_CAMBIO_MS);
    }, RETRASO_INICIAL_MS);
  }

  detenerCambioContinuo() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.intervaloId) {
      clearInterval(this.intervaloId);
      this.intervaloId = null;
    }
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

  restablecer() {
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
      // dato corrupto: se ignora y se mantiene la selección por defecto
    }
  }

  private guardarCacheLocal() {
    if (!this.idUsuario) return;
    localStorage.setItem(this.claveAlmacenamiento(this.idUsuario), JSON.stringify(this.indices));
  }

  private claveAlmacenamiento(idUsuario: string): string {
    return `culturego-avatar-${idUsuario}`;
  }

  /** Supabase (PostgrestError) no es instancia de Error, por eso se usa duck typing. */
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
