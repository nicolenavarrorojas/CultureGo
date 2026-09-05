import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  timeOutline,
  pricetagOutline,
  checkmarkCircleOutline,
  flagOutline,
} from 'ionicons/icons';

import { Lugares } from 'src/app/core/services/lugares';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Auth } from 'src/app/core/services/auth';
import { Lugar } from 'src/app/core/models';
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

  constructor(
    private lugaresService: Lugares,
    private gamificacionService: Gamificacion,
    private authService: Auth,
    private route: ActivatedRoute,
    private location: Location
  ) {
    addIcons({
      locationOutline,
      timeOutline,
      pricetagOutline,
      checkmarkCircleOutline,
      flagOutline,
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