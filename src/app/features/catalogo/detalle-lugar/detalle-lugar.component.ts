import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonSkeletonText,
  IonToast,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  timeOutline,
  pricetagOutline,
  checkmarkCircleOutline,
  flagOutline,
  star,
  starOutline,
  trashOutline,
} from 'ionicons/icons';

import { Lugares } from 'src/app/core/services/lugares';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Auth } from 'src/app/core/services/auth';
import { Resenas } from 'src/app/core/services/resenas';
import { Admin } from 'src/app/core/services/admin';
import { Lugar, Resena } from 'src/app/core/models';
import { ReportarProblemaComponent } from 'src/app/shared/components/reportar-problema/reportar-problema.component';

// Radio del cual se acepta el registro de visita.
// lugares grandes (parques, cerros) usan un radio más grande porque las coordenadas registradas son un punto 
// pero el lugar puede abarcar varios metros.
const RADIO_VALIDACION_DEFECTO_METROS = 150;
const RADIO_VALIDACION_POR_CATEGORIA: Record<string, number> = {
  Parque: 400,
  Cerro: 400,
};

@Component({
  selector: 'app-detalle-lugar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonContent,
    IonIcon,
    IonSkeletonText,
    IonToast,
    ReportarProblemaComponent,
  ],
  templateUrl: './detalle-lugar.component.html',
  styleUrls: ['./detalle-lugar.component.scss'],
})
export class DetalleLugarComponent implements OnInit {
  lugar: Lugar | null = null;
  cargando = true;
  errorCarga = false;

  registrandoVisita = false;
  mostrarReporte = false;
  toastMensaje = '';
  toastColor: 'success' | 'warning' = 'success';
  mostrarToast = false;

  // Reseñas
  resenas: Resena[] = [];
  cargandoResenas = true;
  promedioCalificacion: number | null = null;
  idUsuarioActual: string | null = null;
  esAdmin = false;

  calificacionSeleccionada = 0;
  comentarioResena = '';
  guardandoResena = false;

  constructor(
    private lugaresService: Lugares,
    private gamificacionService: Gamificacion,
    private authService: Auth,
    private resenasService: Resenas,
    private adminService: Admin,
    private route: ActivatedRoute,
    private location: Location,
    private alertController: AlertController
  ) {
    addIcons({
      locationOutline,
      timeOutline,
      pricetagOutline,
      checkmarkCircleOutline,
      flagOutline,
      star,
      starOutline,
      trashOutline,
    });
  }

  async ngOnInit() {
    const idLugar = this.route.snapshot.paramMap.get('id');
    if (!idLugar) {
      this.errorCarga = true;
      this.cargando = false;
      return;
    }
    await this.cargarLugar(idLugar);
    if (this.lugar) {
      await this.cargarDatosUsuarioYResenas(idLugar);
    }
  }

  private async cargarLugar(idLugar: string) {
    this.cargando = true;
    this.errorCarga = false;
    try {
      this.lugar = await this.lugaresService.obtenerPorId(idLugar);
    } catch {
      this.errorCarga = true;
    } finally {
      this.cargando = false;
    }
  }

  // Reseñas

  private async cargarDatosUsuarioYResenas(idLugar: string) {
    this.cargandoResenas = true;
    try {
      const usuarioActual = await this.authService.obtenerUsuarioActual();
      this.idUsuarioActual = usuarioActual?.id_usuario ?? null;
      this.esAdmin = !!usuarioActual?.es_admin;

      this.resenas = await this.resenasService.listarPorLugar(idLugar);
      this.calcularPromedio();

      if (usuarioActual) {
        const miResena = this.resenas.find((r) => r.id_usuario === usuarioActual.id_usuario);
        if (miResena) {
          this.calificacionSeleccionada = miResena.calificacion;
          this.comentarioResena = miResena.comentario ?? '';
        }
      }
    } finally {
      this.cargandoResenas = false;
    }
  }

  private calcularPromedio() {
    if (!this.resenas.length) {
      this.promedioCalificacion = null;
      return;
    }
    const suma = this.resenas.reduce((total, r) => total + r.calificacion, 0);
    this.promedioCalificacion = suma / this.resenas.length;
  }

  get yaTengoResena(): boolean {
    return this.resenas.some((r) => r.id_usuario === this.idUsuarioActual);
  }

  seleccionarEstrella(valor: number) {
    this.calificacionSeleccionada = valor;
  }

  get formularioResenaValido(): boolean {
    return this.calificacionSeleccionada >= 1 && this.calificacionSeleccionada <= 5;
  }

  async guardarResena() {
    if (!this.lugar || !this.formularioResenaValido || this.guardandoResena) return;

    this.guardandoResena = true;
    try {
      const usuarioActual = await this.authService.obtenerUsuarioActual();
      if (!usuarioActual) {
        this.mostrarAviso('Inicia sesión para dejar una reseña', 'warning');
        return;
      }

      await this.resenasService.guardar({
        id_usuario: usuarioActual.id_usuario,
        id_lugar: this.lugar.id_lugar,
        calificacion: this.calificacionSeleccionada,
        comentario: this.comentarioResena.trim() || null,
      });

      this.mostrarAviso(
        this.yaTengoResena ? 'Reseña actualizada.' : '¡Gracias por tu reseña!',
        'success'
      );
      await this.cargarDatosUsuarioYResenas(this.lugar.id_lugar);
    } catch {
      this.mostrarAviso('No se pudo guardar la reseña. Intenta de nuevo.', 'warning');
    } finally {
      this.guardandoResena = false;
    }
  }

  async eliminarResena(resena: Resena) {
    const alerta = await this.alertController.create({
      header: 'Eliminar reseña',
      message: `¿Eliminar la reseña de "${resena.usuario?.nombre ?? 'este usuario'}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'boton-alerta-eliminar',
          handler: () => this.confirmarEliminarResena(resena),
        },
      ],
    });
    await alerta.present();
  }

  private async confirmarEliminarResena(resena: Resena) {
    try {
      await this.adminService.eliminarResena(resena.id_resena);
      this.resenas = this.resenas.filter((r) => r.id_resena !== resena.id_resena);
      this.calcularPromedio();
      this.mostrarAviso('Reseña eliminada.', 'success');
    } catch {
      this.mostrarAviso('No se pudo eliminar la reseña.', 'warning');
    }
  }

  async registrarVisita() {
    if (!this.lugar || this.registrandoVisita) return;

    this.registrandoVisita = true;
    try {
      const usuarioActual = await this.authService.obtenerUsuarioActual();
      if (!usuarioActual) {
        this.mostrarAviso('Inicia sesión para registrar tu visita', 'warning');
        return;
      }

      const validacion = await this.validarProximidad();
      if (!validacion.ok) {
        this.mostrarAviso(validacion.mensaje, 'warning');
        return;
      }

      await this.gamificacionService.registrarVisita(
        usuarioActual.id_usuario,
        this.lugar.id_lugar
      );
      this.mostrarAviso('¡Visita registrada!', 'success');
    } catch (error) {
      this.mostrarAviso(this.traducirErrorVisita(error), 'warning');
    } finally {
      this.registrandoVisita = false;
    }
  }

  /**
   * El trigger fn_validar_cooldown_visita (en Supabase) rechaza la visita
   * si el usuario ya registró este mismo lugar hace menos de X horas, y
   * viene marcado como "COOLDOWN_VISITA:" para poder
   * distinguirlo de cualquier otro error de base de datos.
   */
  private traducirErrorVisita(error: unknown): string {
    const mensaje =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

    if (mensaje.includes('COOLDOWN_VISITA')) {
      return mensaje.split('COOLDOWN_VISITA:')[1]?.trim() || 'Ya registraste esta visita hace poco. Vuelve más tarde.';
    }

    return 'No se pudo registrar la visita. Intenta de nuevo.';
  }

  /**
   * Valida que el usuario esté físicamente cerca del lugar antes de dejarlo
   * registrar la visita
  **/
  private async validarProximidad(): Promise<{ ok: boolean; mensaje: string }> {
    if (!this.lugar) {
      return { ok: false, mensaje: 'No se pudo validar el lugar.' };
    }

    if (this.lugar.latitud == null || this.lugar.longitud == null) {
      return {
        ok: false,
        mensaje: 'No se puede registrar la visita: este lugar no tiene coordenadas cargadas.',
      };
    }

    let posicion: { lat: number; lng: number };
    try {
      posicion = await this.obtenerPosicionActual();
    } catch {
      return {
        ok: false,
        mensaje: 'Activa la ubicación para poder registrar tu visita.',
      };
    }

    const distanciaMetros = this.calcularDistanciaMetros(
      posicion.lat,
      posicion.lng,
      this.lugar.latitud,
      this.lugar.longitud
    );

    const radioPermitido = this.obtenerRadioValidacion();

    if (distanciaMetros > radioPermitido) {
      const distanciaLegible =
        distanciaMetros >= 1000
          ? `${(distanciaMetros / 1000).toFixed(1)} km`
          : `${Math.round(distanciaMetros)} m`;
      return {
        ok: false,
        mensaje: `Estás a ${distanciaLegible} del lugar. Acércate para registrar tu visita.`,
      };
    }

    return { ok: true, mensaje: '' };
  }

  /** Parques y cerros usan un radio más grande*/
  private obtenerRadioValidacion(): number {
    const nombreCategoria = this.lugar?.categoria?.nombre;
    if (nombreCategoria && RADIO_VALIDACION_POR_CATEGORIA[nombreCategoria]) {
      return RADIO_VALIDACION_POR_CATEGORIA[nombreCategoria];
    }
    return RADIO_VALIDACION_DEFECTO_METROS;
  }

  private obtenerPosicionActual(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  /** Distancia entre dos puntos geográficos, fórmula de Haversine (en metros). */
  private calcularDistanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const RADIO_TIERRA_METROS = 6371000;
    const radianes = (grados: number) => (grados * Math.PI) / 180;

    const dLat = radianes(lat2 - lat1);
    const dLng = radianes(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radianes(lat1)) * Math.cos(radianes(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return RADIO_TIERRA_METROS * c;
  }

  private mostrarAviso(mensaje: string, color: 'success' | 'warning') {
    this.toastMensaje = mensaje;
    this.toastColor = color;
    this.mostrarToast = true;
  }

  volver() {
    this.location.back();
  }
}