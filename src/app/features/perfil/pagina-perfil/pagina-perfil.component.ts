import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSkeletonText,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  helpCircleOutline,
  logOutOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  receiptOutline,
  ribbonOutline,
  colorPaletteOutline,
  ticketOutline,
  leafOutline,
  trailSignOutline,
  businessOutline,
  flameOutline,
  bookOutline,
  filmOutline,
  imagesOutline,
} from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Categorias } from 'src/app/core/services/categorias';
import { Usuario, Medalla, UsuarioMedalla } from 'src/app/core/models';
import { ReportarProblemaComponent } from 'src/app/shared/components/reportar-problema/reportar-problema.component';
import { ColorTema, obtenerColorCategoria, obtenerIconoCategoria } from 'src/app/core/utils/tema-categoria';

type MedallaObtenida = UsuarioMedalla & { medalla: Medalla };

interface MedallaConTema {
  medalla: Medalla;
  icono: string;
  color: ColorTema;
}

const LIMITE_MEDALLAS_RECIENTES = 4;

@Component({
  selector: 'app-pagina-perfil',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonSkeletonText,
    IonToast,
    ReportarProblemaComponent,
  ],
  templateUrl: './pagina-perfil.component.html',
  styleUrls: ['./pagina-perfil.component.scss'],
})
export class PaginaPerfilComponent implements OnInit {
  usuario: Usuario | null = null;
  cargando = true;

  totalLugaresVisitados: number | null = null;
  totalCategoriasVisitadas: number | null = null;
  totalMedallas = 0;
  medallasRecientes: MedallaConTema[] = [];

  toastMensaje = '';
  mostrarToast = false;
  mostrarReporte = false;

  constructor(
    private authService: Auth,
    private gamificacionService: Gamificacion,
    private categoriasService: Categorias,
    private router: Router
  ) {
    addIcons({
      settingsOutline,
      helpCircleOutline,
      logOutOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      receiptOutline,
      ribbonOutline,
      colorPaletteOutline,
      ticketOutline,
      leafOutline,
      trailSignOutline,
      businessOutline,
      flameOutline,
      bookOutline,
      filmOutline,
      imagesOutline,
    });
  }

  async ngOnInit() {
    this.cargando = true;
    try {

      this.usuario = await this.authService.obtenerUsuarioActual();
      if (!this.usuario) return;

      const [totalLugares, totalCategorias, medallasObtenidas, categorias] = await Promise.all([
        this.gamificacionService.contarLugaresVisitados(this.usuario.id_usuario),
        this.gamificacionService.contarCategoriasVisitadas(this.usuario.id_usuario),
        this.gamificacionService.listarMedallasDeUsuario(this.usuario.id_usuario) as Promise<
          MedallaObtenida[]
        >,
        this.categoriasService.listar(),
      ]);

      this.totalLugaresVisitados = totalLugares;
      this.totalCategoriasVisitadas = totalCategorias;

      this.totalMedallas = medallasObtenidas.length;

      const nombrePorIdCategoria = new Map<string, string>(
        (categorias as any[]).map((c) => [c.id_categoria, c.nombre])
      );

      const ordenadas = [...medallasObtenidas].sort(
        (a, b) => new Date(b.fecha_obtencion).getTime() - new Date(a.fecha_obtencion).getTime()
      );
      this.medallasRecientes = ordenadas.slice(0, LIMITE_MEDALLAS_RECIENTES).map((um) => {
        const nombreCategoria = um.medalla.id_categoria
          ? nombrePorIdCategoria.get(um.medalla.id_categoria)
          : null;
        return {
          medalla: um.medalla,
          icono: obtenerIconoCategoria(nombreCategoria),
          color: obtenerColorCategoria(nombreCategoria, um.medalla.id_categoria),
        };
      });
    } finally {
      this.cargando = false;
    }
  }

  irAHistorial() {
    this.router.navigateByUrl('/perfil/historial');
  }

  irAMisTickets() {
    this.router.navigateByUrl('/perfil/mis-tickets');
  }

  personalizarAvatar() {
    this.router.navigateByUrl('/perfil/personalizar-avatar');
  }

  irAConfiguracion() {
    this.router.navigateByUrl('/perfil/configuracion');
  }

  irAPanelAdmin() {
    this.router.navigateByUrl('/admin/gestion-lugares');
  }

  irAAyuda() {
    this.mostrarReporte = true;
  }

  async cerrarSesion() {
    await this.authService.cerrarSesion();
    this.router.navigateByUrl('/tabs/inicio');
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}