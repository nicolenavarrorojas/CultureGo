import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonChip,
  IonLabel,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircleOutline } from 'ionicons/icons';

import { Lugares, FiltrosLugar } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { Lugar } from 'src/app/core/models';

interface GrupoLetra {
  letra: string;
  lugares: Lugar[];
}

@Component({
  selector: 'app-lista-lugares',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonChip,
    IonLabel,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
  ],
  templateUrl: './lista-lugares.component.html',
  styleUrls: ['./lista-lugares.component.scss'],
})
export class ListaLugaresComponent implements OnInit {
  terminoBusqueda = '';
  idCategoriaSeleccionada: string | null = null;
  idComunaSeleccionada: string | null = null;
  soloGratuitos = false;

  // TODO: ajustar el tipo real si el modelo Categoria/Comuna difiere
  categorias: { id_categoria: string; nombre: string }[] = [];
  comunas: { id_comuna: string; nombre: string }[] = [];

  lugares: Lugar[] = [];
  cargando = true;

  // Índice alfabético lateral: los lugares agrupados por la inicial de su nombre.
  grupos: GrupoLetra[] = [];
  letras: string[] = [];
  letraActiva = '';
  letraFlotante = '';

  @ViewChild(IonContent, { read: ElementRef }) private contenido?: ElementRef<HTMLElement>;
  @ViewChild('indice') private indice?: ElementRef<HTMLElement>;

  private arrastrandoIndice = false;
  private scrollPendiente = false;

  private debounceBusqueda?: ReturnType<typeof setTimeout>;

  constructor(
    private lugaresService: Lugares,
    private categoriasService: Categorias,
    private comunasService: Comunas,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    addIcons({ closeCircleOutline });
  }

  async ngOnInit() {
    // Llega desde Inicio con ?q=termino cuando el usuario buscó algo
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.terminoBusqueda = q;
    }

    await Promise.all([this.cargarCategorias(), this.cargarComunas()]);
    await this.buscar();
  }

  private async cargarCategorias() {
    // TODO: ajustar Categorias.listar()
    this.categorias = await this.categoriasService.listar();
  }

  private async cargarComunas() {
    // TODO: ajustar Comunas.listar()
    this.comunas = await this.comunasService.listar();
  }

  private async buscar() {
    this.cargando = true;
    try {
      const filtros: FiltrosLugar = {
        texto: this.terminoBusqueda.trim() || undefined,
        id_categoria: this.idCategoriaSeleccionada ?? undefined,
        id_comuna: this.idComunaSeleccionada ?? undefined,
        soloGratuitos: this.soloGratuitos || undefined,
      };
      const resultado = await this.lugaresService.listar(filtros);
      // Orden alfabético en español (ignora mayúsculas y tildes: "Ñuñoa" va después de "N").
      this.lugares = [...resultado].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      );
      this.grupos = this.agruparPorLetra(this.lugares);
      this.letras = this.grupos.map((grupo) => grupo.letra);
      this.letraActiva = this.letras[0] ?? '';
    } finally {
      this.cargando = false;
    }
  }

  /** Inicial del nombre para el índice: sin tilde ("Álamos" -> "A"), la Ñ se mantiene y lo que no es letra va en "#". */
  private inicial(nombre: string): string {
    const primera = nombre.trim().charAt(0).toUpperCase();
    if (primera === 'Ñ') return 'Ñ';
    const sinTilde = primera.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return /^[A-Z]$/.test(sinTilde) ? sinTilde : '#';
  }

  /** Agrupa la lista (ya ordenada) en bloques consecutivos por inicial. */
  private agruparPorLetra(lugares: Lugar[]): GrupoLetra[] {
    const grupos: GrupoLetra[] = [];
    for (const lugar of lugares) {
      const letra = this.inicial(lugar.nombre);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.letra === letra) {
        ultimo.lugares.push(lugar);
      } else {
        grupos.push({ letra, lugares: [lugar] });
      }
    }
    return grupos;
  }

  trackPorLetra(_indice: number, grupo: GrupoLetra): string {
    return grupo.letra;
  }

  //Índice lateral 

  /** Salta al bloque de la letra indicada. */
  irALetra(letra: string) {
    const seccion = this.contenido?.nativeElement.querySelector(`[data-letra="${letra}"]`);
    seccion?.scrollIntoView({ block: 'start' });
    this.letraActiva = letra;
  }

  /** Tocar o arrastrar el dedo por el índice: la letra se calcula por la posición vertical. */
  onIndicePuntero(evento: PointerEvent) {
    const indice = this.indice?.nativeElement;
    if (!indice || !this.letras.length) return;

    if (evento.type === 'pointerdown') {
      this.arrastrandoIndice = true;
      indice.setPointerCapture(evento.pointerId);
    }
    if (!this.arrastrandoIndice) return;

    const caja = indice.getBoundingClientRect();
    const posicion = Math.floor(((evento.clientY - caja.top) / caja.height) * this.letras.length);
    const letra = this.letras[Math.min(this.letras.length - 1, Math.max(0, posicion))];
    if (letra !== this.letraFlotante) {
      this.letraFlotante = letra;
      this.irALetra(letra);
    }
  }

  finIndice() {
    this.arrastrandoIndice = false;
    this.letraFlotante = '';
  }

  /** Al hacer scroll, resalta en el índice la letra del bloque que va arriba. */
  onScroll() {
    if (this.arrastrandoIndice || this.scrollPendiente) return;
    this.scrollPendiente = true;
    requestAnimationFrame(() => {
      this.scrollPendiente = false;
      this.actualizarLetraActiva();
    });
  }

  private actualizarLetraActiva() {
    const contenido = this.contenido?.nativeElement;
    if (!contenido) return;
    const limite = contenido.getBoundingClientRect().top + 60;
    let activa = this.letras[0] ?? '';
    contenido.querySelectorAll<HTMLElement>('.grupo-letra').forEach((seccion) => {
      if (seccion.getBoundingClientRect().top <= limite) {
        activa = seccion.dataset['letra'] ?? activa;
      }
    });
    this.letraActiva = activa;
  }

  onBusquedaCambiada() {
    clearTimeout(this.debounceBusqueda);
    this.debounceBusqueda = setTimeout(() => this.buscar(), 350);
  }

  async onCategoriaSeleccionada(idCategoria: string) {
    this.idCategoriaSeleccionada =
      this.idCategoriaSeleccionada === idCategoria ? null : idCategoria;
    await this.buscar();
  }

  async onComunaCambiada(idComuna: string | null) {
    this.idComunaSeleccionada = idComuna;
    await this.buscar();
  }

  async onToggleGratuidad() {
    this.soloGratuitos = !this.soloGratuitos;
    await this.buscar();
  }

  get hayFiltrosActivos(): boolean {
    return !!(
      this.terminoBusqueda ||
      this.idCategoriaSeleccionada ||
      this.idComunaSeleccionada ||
      this.soloGratuitos
    );
  }

  async limpiarFiltros() {
    this.terminoBusqueda = '';
    this.idCategoriaSeleccionada = null;
    this.idComunaSeleccionada = null;
    this.soloGratuitos = false;
    await this.buscar();
  }

  irADetalle(lugar: Lugar) {
    this.router.navigate(['/lugares', lugar.id_lugar]);
  }

  /** Evita recrear las tarjetas en cada búsqueda/filtro. */
  trackPorId(_indice: number, lugar: Lugar): string {
    return lugar.id_lugar;
  }

  volver() {
    this.location.back();
  }
}