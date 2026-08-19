import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonSearchbar,
  IonChip,
  IonIcon,
  IonLabel,
  IonButton,
  IonAvatar,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, sparklesOutline, locationOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { Lugares } from 'src/app/core/services/lugares';
import { Lugar } from 'src/app/core/models';

type FiltroRapido = 'todos' | 'gratis' | 'cerca';

@Component({
  selector: 'app-pagina-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonChip,
    IonIcon,
    IonLabel,
    IonButton,
    IonAvatar,
    IonSkeletonText,
  ],
  templateUrl: './pagina-inicio.component.html',
  styleUrls: ['./pagina-inicio.component.scss'],
})
export class PaginaInicioComponent implements OnInit {
  nombreUsuario = '';
  terminoBusqueda = '';
  filtroActivo: FiltroRapido = 'todos';

  lugaresRecomendados: Lugar[] = [];
  cargando = true;

  // LIMITE DE CUANTOS LUGARES MOSTRAR
  private readonly LIMITE_RECOMENDADOS = 5;

  constructor(
    private auth: Auth,
    private lugares: Lugares,
    private router: Router
  ) {
    addIcons({ mapOutline, sparklesOutline, locationOutline });
  }

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarRecomendados();
  }

  private async cargarUsuario() {
    // TODO: ajustar según la forma real del objeto que devuelve Auth.obtenerUsuarioActual()
    const usuario = await this.auth.obtenerUsuarioActual();
    this.nombreUsuario = usuario?.nombre?.split(' ')[0] ?? '';
  }

  private async cargarRecomendados() {
    this.cargando = true;
    try {
      // TODO: ajustar según la implementación real de Lugares.listar(filtros)
      const filtros = this.filtroActivo === 'gratis' ? { soloGratuitos: true } : {};
      const resultado = await this.lugares.listar(filtros);
      this.lugaresRecomendados = resultado.slice(0, this.LIMITE_RECOMENDADOS);
    } finally {
      this.cargando = false;
    }
  }

  async onFiltroSeleccionado(filtro: FiltroRapido) {
    this.filtroActivo = filtro;

    if (filtro === 'cerca') {
      // Desde Inicio solo se redirige al mapa por técnica de "cerca de mí".
      this.router.navigate(['/tabs/mapa'], { queryParams: { cerca: true } });
      return;
    }

    await this.cargarRecomendados();
  }

  onBuscar() {
    if (!this.terminoBusqueda.trim()) {
      return;
    }
    // La búsqueda completa se resuelve en el catálogo (/lugares).
    this.router.navigate(['/lugares'], {
      queryParams: { q: this.terminoBusqueda.trim() },
    });
  }

  irADetalle(lugar: Lugar) {
    this.router.navigate(['/lugares', lugar.id_lugar]);
  }

  irAVerMapa() {
    this.router.navigate(['/tabs/mapa']);
  }

  irAVerTodos() {
    this.router.navigate(['/lugares']);
  }
}