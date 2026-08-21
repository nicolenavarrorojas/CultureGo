import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonChip,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locateOutline, closeOutline } from 'ionicons/icons';

import { Lugares, FiltrosLugar } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { Lugar } from 'src/app/core/models';

// Centro por defecto: Santiago Centro 
const CENTRO_SANTIAGO: L.LatLngTuple = [-33.4489, -70.6693];
const ZOOM_DEFECTO = 14;
// RADIO, de cuanto esta cerca en metros.
const RADIO_CERCA_METROS = 2000;

@Component({
  selector: 'app-pagina-mapa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonChip,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './pagina-mapa.component.html',
  styleUrls: ['./pagina-mapa.component.scss'],
})
export class PaginaMapaComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapaContenedor', { static: true }) mapaContenedor!: ElementRef<HTMLDivElement>;

  private mapa?: L.Map;
  private capaMarcadores?: L.LayerGroup;
  private observadorTamano?: ResizeObserver;
  private marcadorMiUbicacion?: L.Marker;

  cargando = true;
  lugares: Lugar[] = [];
  lugarSeleccionado: Lugar | null = null;
  sinResultadosCerca = false;

  idCategoriaSeleccionada: string | null = null;
  idComunaSeleccionada: string | null = null;
  soloGratuitos = false;

  // TODO: ajustar el tipo real si el modelo Categoria/Comuna difiere
  categorias: { id_categoria: string; nombre: string }[] = [];
  comunas: { id_comuna: string; nombre: string }[] = [];

  constructor(
    private lugaresService: Lugares,
    private categoriasService: Categorias,
    private comunasService: Comunas,
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({ locateOutline, closeOutline });
  }

  async ngOnInit() {
    await Promise.all([this.cargarCategorias(), this.cargarComunas()]);
  }


  async ionViewWillEnter() {
    const buscarCerca = this.route.snapshot.queryParamMap.get('cerca') === 'true';

    if (buscarCerca) {
      await this.buscarCercaDeMi();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    } else if (!this.lugares.length) {
      await this.cargarLugares();
    }
  }

  ngAfterViewInit() {
    this.inicializarMapa();
    if (this.lugares.length) {
      this.pintarMarcadores();
    }

    requestAnimationFrame(() => this.mapa?.invalidateSize());
    setTimeout(() => this.mapa?.invalidateSize(), 300);

    this.observadorTamano = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observadorTamano.observe(this.mapaContenedor.nativeElement);
  }

  ionViewDidEnter() {
    setTimeout(() => this.mapa?.invalidateSize(), 100);
  }

  ngOnDestroy() {
    this.observadorTamano?.disconnect();
    this.mapa?.remove();
  }

  private inicializarMapa() {
    this.mapa = L.map(this.mapaContenedor.nativeElement, {
      zoomControl: false,
    }).setView(CENTRO_SANTIAGO, ZOOM_DEFECTO);

    L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);

    // Tile server público de OpenStreetMap (gratis, sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.mapa);

    this.capaMarcadores = L.layerGroup().addTo(this.mapa);

    this.mapa.on('click', () => {
      this.lugarSeleccionado = null;
    });
  }

  private crearIconoPin(seleccionado: boolean): L.DivIcon {
    const color = seleccionado ? 'var(--ion-color-secondary)' : 'var(--ion-color-primary)';
    return L.divIcon({
      className: 'pin-lugar',
      html: `<span class="pin-punto" style="background:${color}"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  private crearIconoMiUbicacion(): L.DivIcon {
    return L.divIcon({
      className: 'pin-mi-ubicacion',
      html: `<span class="halo"></span><span class="punto"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  private mostrarMiUbicacion(lat: number, lng: number) {
    if (!this.mapa) return;

    if (this.marcadorMiUbicacion) {
      this.marcadorMiUbicacion.setLatLng([lat, lng]);
    } else {
      this.marcadorMiUbicacion = L.marker([lat, lng], {
        icon: this.crearIconoMiUbicacion(),
        zIndexOffset: 1000, 
        interactive: false,
      }).addTo(this.mapa);
    }
  }

  private async cargarCategorias() {
    this.categorias = await this.categoriasService.listar();
  }

  private async cargarComunas() {
    this.comunas = await this.comunasService.listar();
  }

  private async cargarLugares() {
    this.cargando = true;
    try {
      const filtros: FiltrosLugar = {
        id_categoria: this.idCategoriaSeleccionada ?? undefined,
        id_comuna: this.idComunaSeleccionada ?? undefined,
        soloGratuitos: this.soloGratuitos || undefined,
      };
      this.lugares = await this.lugaresService.listar(filtros);
      this.pintarMarcadores();
    } finally {
      this.cargando = false;
    }
  }

  private async buscarCercaDeMi() {
    this.cargando = true;
    this.sinResultadosCerca = false;
    try {
      const posicion = await this.obtenerPosicionActual();
      this.mapa?.setView([posicion.lat, posicion.lng], 12); 
      this.mostrarMiUbicacion(posicion.lat, posicion.lng);
      this.lugares = await this.lugaresService.listarCercanos(
        posicion.lat,
        posicion.lng,
        RADIO_CERCA_METROS
      );
      this.pintarMarcadores();
      this.sinResultadosCerca = this.lugares.length === 0;
    } catch {
      await this.cargarLugares();
    } finally {
      this.cargando = false;
    }
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
        { timeout: 8000 }
      );
    });
  }

  private pintarMarcadores() {
    if (!this.mapa || !this.capaMarcadores) {
      return; 
    }

    this.capaMarcadores.clearLayers();

    for (const lugar of this.lugares) {
      if (lugar.latitud == null || lugar.longitud == null) {
        continue; // sin coordenadas, no se puede mostrar (mismo criterio que RF-08)
      }

      const marcador = L.marker([lugar.latitud, lugar.longitud], {
        icon: this.crearIconoPin(this.lugarSeleccionado?.id_lugar === lugar.id_lugar),
      });

      marcador.on('click', (evento) => {
        L.DomEvent.stopPropagation(evento); 
        this.seleccionarLugar(lugar);
      });

      this.capaMarcadores.addLayer(marcador);
    }
  }

  seleccionarLugar(lugar: Lugar) {
    this.lugarSeleccionado = lugar;

    if (lugar.latitud != null && lugar.longitud != null && this.mapa) {
      const ALTURA_APROX_TARJETA_PX = 150;
      const puntoPantalla = this.mapa.latLngToContainerPoint([lugar.latitud, lugar.longitud]);
      const puntoDesplazado = puntoPantalla.subtract([0, ALTURA_APROX_TARJETA_PX / 2]);
      const centroAjustado = this.mapa.containerPointToLatLng(puntoDesplazado);
      this.mapa.panTo(centroAjustado);
    }

    this.pintarMarcadores(); 
  }

  cerrarTarjeta() {
    this.lugarSeleccionado = null;
    this.pintarMarcadores();
  }

  async onCategoriaSeleccionada(idCategoria: string) {
    this.idCategoriaSeleccionada =
      this.idCategoriaSeleccionada === idCategoria ? null : idCategoria;
    await this.cargarLugares();
  }

  async onComunaCambiada(idComuna: string | null) {
    this.idComunaSeleccionada = idComuna;
    await this.cargarLugares();
  }

  async onToggleGratuidad() {
    this.soloGratuitos = !this.soloGratuitos;
    await this.cargarLugares();
  }

  async irAMiUbicacion() {
    this.cargando = true;
    try {
      const posicion = await this.obtenerPosicionActual();
      this.mapa?.flyTo([posicion.lat, posicion.lng], 15);
      this.mostrarMiUbicacion(posicion.lat, posicion.lng);
    } catch {
      // TODO: mostrar un toast si el permiso de geolocalización fue denegado
    } finally {
      this.cargando = false;
    }
  }

  irADetalle(lugar: Lugar) {
    this.router.navigate(['/lugares', lugar.id_lugar]);
  }

  async verCatalogoCompleto() {
    this.sinResultadosCerca = false;
    await this.cargarLugares();
  }
}