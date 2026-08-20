import { Component, OnInit } from '@angular/core';
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
      this.lugares = await this.lugaresService.listar(filtros);
    } finally {
      this.cargando = false;
    }
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

  volver() {
    this.location.back();
  }
}