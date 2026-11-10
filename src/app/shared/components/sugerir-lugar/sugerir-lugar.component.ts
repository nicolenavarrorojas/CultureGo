import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {
  AlertController,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, paperPlaneOutline, searchOutline, locateOutline } from 'ionicons/icons';

import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Categorias } from 'src/app/core/services/categorias';
import { Auth } from 'src/app/core/services/auth';
import {
  Geocodificacion,
  ResultadoDireccion,
  mensajeErrorGeocodificacion,
} from 'src/app/core/services/geocodificacion';
import { obtenerUbicacionActual, mensajeErrorUbicacion, UbicacionError } from 'src/app/core/utils/ubicacion';

const CENTRO_SANTIAGO: L.LatLngTuple = [-33.4489, -70.6693];
const ZOOM_PUNTO = 17;

@Component({
  selector: 'app-sugerir-lugar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonToast,
  ],
  templateUrl: './sugerir-lugar.component.html',
  styleUrls: ['./sugerir-lugar.component.scss'],
})
export class SugerirLugarComponent {
  @Input() abierto = false;
  @Output() cerrado = new EventEmitter<void>();

  @ViewChild('mapaContenedor') mapaContenedor?: ElementRef<HTMLDivElement>;

  private mapa?: L.Map;
  private marcador?: L.Marker;
  private ubicacionExplicada = false;

  nombre = '';
  descripcion = '';
  direccion = '';
  idCategoria: string | null = null;
  latitudSeleccionada: number | null = null;
  longitudSeleccionada: number | null = null;
  enviando = false;

  resultadosDireccion: ResultadoDireccion[] = [];
  buscandoDireccion = false;
  obteniendoUbicacion = false;
  mensajeUbicacion = '';
  mensajeUbicacionEsError = false;

  categorias: { id_categoria: string; nombre: string }[] = [];

  toastMensaje = '';
  mostrarToast = false;

  constructor(
    private sugerenciasService: SugerenciasLugar,
    private categoriasService: Categorias,
    private authService: Auth,
    private geocodificacion: Geocodificacion,
    private alertController: AlertController
  ) {
    addIcons({ closeOutline, paperPlaneOutline, searchOutline, locateOutline });
  }

  async onModalPresentado() {
    await this.cargarCategorias();
    this.inicializarMapa();
  }

  onModalOcultado() {
    // El contenido del ng-template se destruye al cerrar el modal, así
    // que el mapa también hay que destruirlo
    this.mapa?.remove();
    this.mapa = undefined;
    this.marcador = undefined;
  }

  private async cargarCategorias() {
    this.categorias = await this.categoriasService.listar();
  }

  private inicializarMapa() {
    if (!this.mapaContenedor) return;

    const centro: L.LatLngTuple =
      this.latitudSeleccionada != null && this.longitudSeleccionada != null
        ? [this.latitudSeleccionada, this.longitudSeleccionada]
        : CENTRO_SANTIAGO;
    this.mapa = L.map(this.mapaContenedor.nativeElement, { zoomControl: false }).setView(centro, 13);
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.mapa);

    this.mapa.on('click', (evento: L.LeafletMouseEvent) => {
      this.colocarMarcador(evento.latlng.lat, evento.latlng.lng);
    });

    if (this.latitudSeleccionada != null && this.longitudSeleccionada != null) {
      this.colocarMarcador(this.latitudSeleccionada, this.longitudSeleccionada);
    }

    requestAnimationFrame(() => this.mapa?.invalidateSize());
  }

  private colocarMarcador(lat: number, lng: number, centrar = false) {
    this.latitudSeleccionada = lat;
    this.longitudSeleccionada = lng;

    if (!this.mapa) return;

    if (this.marcador) {
      this.marcador.setLatLng([lat, lng]);
    } else {
      const icono = L.divIcon({
        className: 'pin-sugerido',
        html: `<span class="pin-punto"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });
      // El pin se puede arrastrar para ajustar el punto después de buscar la dirección.
      this.marcador = L.marker([lat, lng], { icon: icono, draggable: true }).addTo(this.mapa);
      this.marcador.on('dragend', () => {
        const posicion = this.marcador!.getLatLng();
        this.latitudSeleccionada = posicion.lat;
        this.longitudSeleccionada = posicion.lng;
      });
    }

    if (centrar) this.mapa.setView([lat, lng], ZOOM_PUNTO);
  }

  /** Busca la dirección escrita y muestra los resultados para que el usuario elija uno. */
  async buscarDireccion() {
    const texto = this.direccion.trim();
    if (!texto) {
      this.avisarUbicacion('Escribe una dirección para buscarla.', true);
      return;
    }
    if (this.buscandoDireccion) return;

    this.buscandoDireccion = true;
    this.resultadosDireccion = [];
    this.avisarUbicacion('');
    try {
      const resultados = await this.geocodificacion.buscar(texto);
      if (!resultados.length) {
        this.avisarUbicacion(
          'No encontramos esa dirección en Santiago. Revisa cómo la escribiste o marca el punto en el mapa.',
          true
        );
      } else if (resultados.length === 1) {
        this.elegirResultado(resultados[0]);
      } else {
        this.resultadosDireccion = resultados;
      }
    } catch (error) {
      this.avisarUbicacion(mensajeErrorGeocodificacion(error), true);
    } finally {
      this.buscandoDireccion = false;
    }
  }

  cerrarResultados() {
    this.resultadosDireccion = [];
  }

  /** Con el menú abierto, Escape cierra solo el menú y no el formulario completo. */
  alPresionarEscape(evento: Event) {
    if (!this.resultadosDireccion.length) return;
    evento.stopPropagation();
    this.cerrarResultados();
  }

  /** Cierra el menú de direcciones al tocar fuera del buscador. */
  alTocarContenido(evento: Event) {
    if (!this.resultadosDireccion.length) return;
    const destino = evento.target as HTMLElement | null;
    if (!destino?.closest('.campo-ubicacion')) this.cerrarResultados();
  }

  elegirResultado(resultado: ResultadoDireccion) {
    this.direccion = resultado.etiqueta;
    this.resultadosDireccion = [];
    this.colocarMarcador(resultado.latitud, resultado.longitud, true);
    // La instrucción fija bajo el botón ya explica cómo ajustar el pin.
    this.avisarUbicacion('');
  }

  /** Marca el punto donde está el usuario y completa la dirección aproximada. */
  async usarUbicacionActual() {
    if (this.obteniendoUbicacion) return;
    const permiso = await this.estadoPermisoUbicacion();
    if (permiso === 'denied') {
      // El sistema ya no volverá a preguntar: se explica cómo activarlo.
      this.resultadosDireccion = [];
      this.avisarUbicacion(mensajeErrorUbicacion(new UbicacionError('denegado')), true);
      return;
    }
    if (permiso !== 'granted' && !(await this.explicarUsoUbicacion())) return;

    this.obteniendoUbicacion = true;
    this.resultadosDireccion = [];
    this.avisarUbicacion('');
    try {
      const ubicacion = await obtenerUbicacionActual();
      this.colocarMarcador(ubicacion.latitud, ubicacion.longitud, true);

      // La dirección es un complemento: si no se obtiene, el punto ya quedó marcado.
      try {
        const direccion = await this.geocodificacion.direccionDe(ubicacion.latitud, ubicacion.longitud);
        if (direccion) this.direccion = direccion;
      } catch {
        // Sin dirección se puede enviar igual.
      }
    } catch (error) {
      this.avisarUbicacion(mensajeErrorUbicacion(error), true);
    } finally {
      this.obteniendoUbicacion = false;
    }
  }

  /**
   * Explica para qué se usa la ubicación antes de que el sistema pida el permiso (RNF-15).
   * Se muestra una vez mientras el formulario está abierto.
   */
  private async explicarUsoUbicacion(): Promise<boolean> {
    if (this.ubicacionExplicada) return true;

    const alerta = await this.alertController.create({
      header: 'Usar tu ubicación',
      message:
        'Usaremos tu ubicación solo para marcar en el mapa el lugar que sugieres. Úsala si estás en ese lugar.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Continuar', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    this.ubicacionExplicada = role === 'confirm';
    return this.ubicacionExplicada;
  }

  /** Estado del permiso de ubicación, o 'prompt' si el navegador no permite consultarlo. */
  private async estadoPermisoUbicacion(): Promise<PermissionState> {
    try {
      const estado = await navigator.permissions?.query({ name: 'geolocation' });
      return estado?.state ?? 'prompt';
    } catch {
      return 'prompt';
    }
  }

  private avisarUbicacion(mensaje: string, esError = false) {
    this.mensajeUbicacion = mensaje;
    this.mensajeUbicacionEsError = esError;
  }

  get formularioValido(): boolean {
    return (
      this.nombre.trim().length > 0 &&
      !!this.idCategoria &&
      this.latitudSeleccionada != null &&
      this.longitudSeleccionada != null
    );
  }

  async enviar() {
    if (!this.formularioValido || this.enviando) return;

    this.enviando = true;
    try {
      const usuario = await this.authService.obtenerUsuarioActual();
      if (!usuario) {
        this.mostrarAviso('Inicia sesión para sugerir un lugar.');
        return;
      }

      await this.sugerenciasService.crear({
        id_usuario: usuario.id_usuario,
        nombre: this.nombre.trim(),
        id_categoria: this.idCategoria!,
        descripcion: this.descripcion.trim() || null,
        direccion: this.direccion.trim() || null,
        latitud: this.latitudSeleccionada!,
        longitud: this.longitudSeleccionada!,
      });

      this.mostrarAviso('¡Gracias! Tu sugerencia fue enviada.');
      this.reiniciarFormulario();
      setTimeout(() => this.cerrar(), 1200);
    } catch {
      this.mostrarAviso('No se pudo enviar la sugerencia. Intenta de nuevo.');
    } finally {
      this.enviando = false;
    }
  }

  private reiniciarFormulario() {
    this.nombre = '';
    this.descripcion = '';
    this.direccion = '';
    this.idCategoria = null;
    this.latitudSeleccionada = null;
    this.longitudSeleccionada = null;
    this.resultadosDireccion = [];
    this.avisarUbicacion('');
  }

  cerrar() {
    this.cerrado.emit();
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}
