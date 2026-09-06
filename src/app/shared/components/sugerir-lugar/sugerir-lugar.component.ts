import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {
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
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, paperPlaneOutline } from 'ionicons/icons';

import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Categorias } from 'src/app/core/services/categorias';
import { Auth } from 'src/app/core/services/auth';

const CENTRO_SANTIAGO: L.LatLngTuple = [-33.4489, -70.6693];

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

  nombre = '';
  descripcion = '';
  idCategoria: string | null = null;
  latitudSeleccionada: number | null = null;
  longitudSeleccionada: number | null = null;
  enviando = false;

  categorias: { id_categoria: string; nombre: string }[] = [];

  toastMensaje = '';
  mostrarToast = false;

  constructor(
    private sugerenciasService: SugerenciasLugar,
    private categoriasService: Categorias,
    private authService: Auth
  ) {
    addIcons({ closeOutline, paperPlaneOutline });
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

    this.mapa = L.map(this.mapaContenedor.nativeElement, { zoomControl: false }).setView(
      CENTRO_SANTIAGO,
      13
    );
    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.mapa);

    this.mapa.on('click', (evento: L.LeafletMouseEvent) => {
      this.colocarMarcador(evento.latlng.lat, evento.latlng.lng);
    });

    requestAnimationFrame(() => this.mapa?.invalidateSize());
  }

  private colocarMarcador(lat: number, lng: number) {
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
      this.marcador = L.marker([lat, lng], { icon: icono }).addTo(this.mapa);
    }
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
    this.idCategoria = null;
    this.latitudSeleccionada = null;
    this.longitudSeleccionada = null;
  }

  cerrar() {
    this.cerrado.emit();
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}