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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, imageOutline, lockClosedOutline, checkmarkCircle } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { OpcionAvatar, ParteAvatar } from 'src/app/core/models';

const PARTES: { clave: ParteAvatar; etiqueta: string }[] = [
  { clave: 'cabeza', etiqueta: 'Cabeza' },
  { clave: 'ojos', etiqueta: 'Ojos' },
  { clave: 'boca', etiqueta: 'Boca' },
  { clave: 'cuerpo', etiqueta: 'Cuerpo' },
];

// Catálogo de ejemplo: las imágenes de cada pieza se cargarán más adelante,
// mientras tanto cada opción se muestra como un placeholder.
const OPCIONES_MOCK: OpcionAvatar[] = [
  { id_opcion: 'cabeza-1', parte: 'cabeza', nombre: 'Cabeza 1', url_imagen: '', desbloqueable: false },
  { id_opcion: 'cabeza-2', parte: 'cabeza', nombre: 'Cabeza 2', url_imagen: '', desbloqueable: false },
  { id_opcion: 'cabeza-3', parte: 'cabeza', nombre: 'Cabeza 3', url_imagen: '', desbloqueable: false },
  { id_opcion: 'cabeza-4', parte: 'cabeza', nombre: 'Cabeza 4', url_imagen: '', desbloqueable: true },

  { id_opcion: 'ojos-1', parte: 'ojos', nombre: 'Ojos 1', url_imagen: '', desbloqueable: false },
  { id_opcion: 'ojos-2', parte: 'ojos', nombre: 'Ojos 2', url_imagen: '', desbloqueable: false },
  { id_opcion: 'ojos-3', parte: 'ojos', nombre: 'Ojos 3', url_imagen: '', desbloqueable: false },
  { id_opcion: 'ojos-4', parte: 'ojos', nombre: 'Ojos 4', url_imagen: '', desbloqueable: true },

  { id_opcion: 'boca-1', parte: 'boca', nombre: 'Boca 1', url_imagen: '', desbloqueable: false },
  { id_opcion: 'boca-2', parte: 'boca', nombre: 'Boca 2', url_imagen: '', desbloqueable: false },
  { id_opcion: 'boca-3', parte: 'boca', nombre: 'Boca 3', url_imagen: '', desbloqueable: false },
  { id_opcion: 'boca-4', parte: 'boca', nombre: 'Boca 4', url_imagen: '', desbloqueable: true },

  { id_opcion: 'cuerpo-1', parte: 'cuerpo', nombre: 'Cuerpo 1', url_imagen: '', desbloqueable: false },
  { id_opcion: 'cuerpo-2', parte: 'cuerpo', nombre: 'Cuerpo 2', url_imagen: '', desbloqueable: false },
  { id_opcion: 'cuerpo-3', parte: 'cuerpo', nombre: 'Cuerpo 3', url_imagen: '', desbloqueable: false },
  { id_opcion: 'cuerpo-4', parte: 'cuerpo', nombre: 'Cuerpo 4', url_imagen: '', desbloqueable: true },
];

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
export class PersonalizarAvatarComponent implements OnInit {
  partes = PARTES;
  parteActiva: ParteAvatar = 'cabeza';

  opcionesPorParte: Record<ParteAvatar, OpcionAvatar[]> = {
    cabeza: OPCIONES_MOCK.filter((o) => o.parte === 'cabeza'),
    ojos: OPCIONES_MOCK.filter((o) => o.parte === 'ojos'),
    boca: OPCIONES_MOCK.filter((o) => o.parte === 'boca'),
    cuerpo: OPCIONES_MOCK.filter((o) => o.parte === 'cuerpo'),
  };

  seleccion: Record<ParteAvatar, OpcionAvatar | null> = {
    cabeza: null,
    ojos: null,
    boca: null,
    cuerpo: null,
  };

  toastMensaje = '';
  mostrarToast = false;

  private idUsuario: string | null = null;

  constructor(private authService: Auth, private location: Location) {
    addIcons({ personOutline, imageOutline, lockClosedOutline, checkmarkCircle });
  }

  async ngOnInit() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.idUsuario = usuario?.id_usuario ?? null;
    this.cargarSeleccionGuardada();
  }

  seleccionarParte(parte: ParteAvatar) {
    this.parteActiva = parte;
  }

  elegirOpcion(opcion: OpcionAvatar) {
    if (opcion.desbloqueable) {
      this.mostrarAviso('Todavía no has desbloqueado esta pieza');
      return;
    }
    this.seleccion[opcion.parte] = opcion;
  }

  estaSeleccionada(opcion: OpcionAvatar): boolean {
    return this.seleccion[opcion.parte]?.id_opcion === opcion.id_opcion;
  }

  guardar() {
    if (this.idUsuario) {
      localStorage.setItem(this.claveAlmacenamiento(this.idUsuario), JSON.stringify(this.seleccion));
    }
    this.mostrarAviso('Avatar guardado');
  }

  volver() {
    this.location.back();
  }

  private cargarSeleccionGuardada() {
    if (!this.idUsuario) return;
    const guardado = localStorage.getItem(this.claveAlmacenamiento(this.idUsuario));
    if (!guardado) return;
    try {
      this.seleccion = JSON.parse(guardado);
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
