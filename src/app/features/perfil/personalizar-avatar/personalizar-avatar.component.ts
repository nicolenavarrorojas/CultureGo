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
import { OpcionAvatar, ParteAvatar } from 'src/app/core/models';

const RUTA_AVATARES = 'assets/avatares';
const RUTA_BASE = `${RUTA_AVATARES}/base.png`;

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

function generarOpciones(parte: ParteAvatar, etiqueta: string, cantidad: number): OpcionAvatar[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const numero = i + 1;
    return {
      id_opcion: `${parte}-${numero}`,
      parte,
      nombre: `${etiqueta} ${numero}`,
      url_imagen: `${RUTA_AVATARES}/${parte}/${parte}-${numero}.png`,
      desbloqueable: false,
    };
  });
}

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
  ],
  templateUrl: './personalizar-avatar.component.html',
  styleUrls: ['./personalizar-avatar.component.scss'],
})
export class PersonalizarAvatarComponent implements OnInit, OnDestroy {
  readonly rutaBase = RUTA_BASE;
  partes = PARTES;

  opcionesPorParte: Record<ParteAvatar, OpcionAvatar[]> = {
    cabeza: generarOpciones('cabeza', 'Cabeza', CANTIDAD_POR_PARTE.cabeza),
    ojos: generarOpciones('ojos', 'Ojos', CANTIDAD_POR_PARTE.ojos),
    boca: generarOpciones('boca', 'Boca', CANTIDAD_POR_PARTE.boca),
    cuerpo: generarOpciones('cuerpo', 'Cuerpo', CANTIDAD_POR_PARTE.cuerpo),
  };

  // 0 = ninguno; N = opción N de esa parte.
  indices: Record<ParteAvatar, number> = { ...INDICES_INICIALES };

  seleccion: Record<ParteAvatar, OpcionAvatar | null> = {
    cabeza: null,
    ojos: null,
    boca: null,
    cuerpo: null,
  };

  toastMensaje = '';
  mostrarToast = false;

  private idUsuario: string | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private intervaloId: ReturnType<typeof setInterval> | null = null;

  constructor(private authService: Auth, private location: Location) {
    addIcons({ chevronBackOutline, chevronForwardOutline, giftOutline });
  }

  async ngOnInit() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.idUsuario = usuario?.id_usuario ?? null;
    this.cargarSeleccionGuardada();
    this.actualizarSeleccion();
  }

  ngOnDestroy() {
    this.detenerCambioContinuo();
  }

  /** Un solo paso (tap breve). */
  cambiarPaso(parte: ParteAvatar, direccion: 1 | -1) {
    const total = CANTIDAD_POR_PARTE[parte] + 1;
    this.indices[parte] = (this.indices[parte] + direccion + total) % total;
    this.actualizarSeleccion();
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

  guardar() {
    if (this.idUsuario) {
      localStorage.setItem(this.claveAlmacenamiento(this.idUsuario), JSON.stringify(this.indices));
    }
    this.mostrarAviso('Avatar guardado');
  }

  restablecer() {
    this.indices = { ...INDICES_INICIALES };
    this.actualizarSeleccion();
    this.mostrarAviso('Avatar restablecido');
  }

  volver() {
    this.location.back();
  }

  private actualizarSeleccion() {
    for (const { clave } of this.partes) {
      const indice = this.indices[clave];
      this.seleccion[clave] = indice === 0 ? null : this.opcionesPorParte[clave][indice - 1];
    }
  }

  private cargarSeleccionGuardada() {
    if (!this.idUsuario) return;
    const guardado = localStorage.getItem(this.claveAlmacenamiento(this.idUsuario));
    if (!guardado) return;
    try {
      this.indices = JSON.parse(guardado);
    } catch {
      // dato corrupto: se ignora y se mantiene la selección por defecto
    }
  }

  private claveAlmacenamiento(idUsuario: string): string {
    return `culturego-avatar-${idUsuario}`;
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}
