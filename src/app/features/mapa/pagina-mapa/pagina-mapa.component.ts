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
import { locateOutline, closeOutline, handLeftOutline } from 'ionicons/icons';

import { Lugares, FiltrosLugar } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { Lugar } from 'src/app/core/models';

// Centro por defecto: Santiago Centro 
const CENTRO_SANTIAGO: L.LatLngTuple = [-33.4489, -70.6693];
const ZOOM_DEFECTO = 14;
// RADIO, de cuanto esta cerca en metros.
const RADIO_CERCA_METROS = 2000;

// Colores con sentido semántico para las categorías conocidas
const COLORES_POR_NOMBRE: Record<string, { solido: string; tenue: string; texto: string }> = {
  'museo':                { solido: '#6B4FA0', tenue: '#E3DCF2', texto: '#4A3670' }, // jacarandá
  'teatro':               { solido: '#C1622D', tenue: '#F3DDCB', texto: '#7A3A1B' }, // adobe
  'parque':               { solido: '#3E9142', tenue: '#DCEADF', texto: '#2F4F3A' }, // verde (naturaleza)
  'cerro':                { solido: '#5A8A6E', tenue: '#DCEADF', texto: '#2F4F3A' }, // verde cerro
  'edificio patrimonial': { solido: '#9B5B3F', tenue: '#EEDDD3', texto: '#5F3421' }, // terracota
  'iglesia':              { solido: '#8E5A9E', tenue: '#EBDCEF', texto: '#5A3866' }, // violeta
  'biblioteca':           { solido: '#2E6E8E', tenue: '#D7E7EC', texto: '#1D4658' }, // azul (conocimiento)
  'cine':                 { solido: '#4A3F73', tenue: '#DDD9EC', texto: '#2E2650' }, // púrpura oscuro (sala oscura)
  'galería de arte':      { solido: '#C9A227', tenue: '#FBEACB', texto: '#7A5A0F' }, // dorado
};

// Respaldo para categorías nuevas que no estén en el diccionario de arriba
const PALETA_RESPALDO: { solido: string; tenue: string; texto: string }[] = [
  { solido: '#6B4FA0', tenue: '#E3DCF2', texto: '#4A3670' },
  { solido: '#C1622D', tenue: '#F3DDCB', texto: '#7A3A1B' },
  { solido: '#5A8A6E', tenue: '#DCEADF', texto: '#2F4F3A' },
  { solido: '#C9A227', tenue: '#FBEACB', texto: '#7A5A0F' },
  { solido: '#2E6E8E', tenue: '#D7E7EC', texto: '#1D4658' },
  { solido: '#8E5A9E', tenue: '#EBDCEF', texto: '#5A3866' },
];

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
    addIcons({ locateOutline, closeOutline, handLeftOutline });
  }

  mostrarHintDeslizar = true;
  
  async ngOnInit() {
    await Promise.all([this.cargarCategorias(), this.cargarComunas()]);
    setTimeout(() => {
    this.mostrarHintDeslizar = false;
    }, 2500);
  }
  
  onScrollCategorias() {
  this.mostrarHintDeslizar = false;
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

  private colorPorCategoriaDesconocida = new Map<string, { solido: string; tenue: string; texto: string }>();
  private normalizarNombre(nombre: string): string {
    return nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
      .toLowerCase()
      .trim();
  }

  /** Devuelve el color de una categoría. Usa el diccionario semántico si la conoce; 
   *  si no (categoría nueva del admin), asigna un color estable por hash del id. */
  obtenerColorCategoria(categoria: { id_categoria: string; nombre?: string } | null | undefined) {
    if (!categoria) return PALETA_RESPALDO[0];

    const claveNombre = categoria.nombre ? this.normalizarNombre(categoria.nombre) : '';
    if (COLORES_POR_NOMBRE[claveNombre]) {
      return COLORES_POR_NOMBRE[claveNombre];
    }

    const clave = categoria.id_categoria;
    if (!this.colorPorCategoriaDesconocida.has(clave)) {
      let hash = 0;
      for (let i = 0; i < clave.length; i++) {
        hash = (hash * 31 + clave.charCodeAt(i)) >>> 0;
      }
      this.colorPorCategoriaDesconocida.set(clave, PALETA_RESPALDO[hash % PALETA_RESPALDO.length]);
    }
    return this.colorPorCategoriaDesconocida.get(clave)!;
  }

  /** Ajusta esto si tu modelo Lugar guarda la categoría distinto */
  private categoriaDeLugar(lugar: Lugar): { id_categoria: string; nombre?: string } | undefined {
    const cat = (lugar as any).categoria;
    if (cat) return { id_categoria: cat.id_categoria, nombre: cat.nombre };
    if ((lugar as any).id_categoria) return { id_categoria: (lugar as any).id_categoria };
    return undefined;
  }


  private crearIconoPin(lugar: Lugar, seleccionado: boolean): L.DivIcon {
    const color = this.obtenerColorCategoria(this.categoriaDeLugar(lugar)).solido;
    const tamano = seleccionado ? 28 : 22;
    return L.divIcon({
      className: seleccionado ? 'pin-lugar pin-lugar--seleccionado' : 'pin-lugar',
      html: `<span class="pin-punto" style="background:${color}; width:${tamano}px; height:${tamano}px;"></span>`,
      iconSize: [tamano, tamano],
      iconAnchor: [tamano / 2, tamano / 2],
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
      icon: this.crearIconoPin(lugar, this.lugarSeleccionado?.id_lugar === lugar.id_lugar),
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