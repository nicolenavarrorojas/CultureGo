import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonToggle,
  IonSkeletonText,
  IonToast,
} from '@ionic/angular/standalone';
import type { ToggleCustomEvent } from '@ionic/angular/standalone';
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
  moonOutline,
} from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Categorias } from 'src/app/core/services/categorias';
import { AvatarService } from 'src/app/core/services/avatar';
import { Theme } from 'src/app/core/services/theme';
import { ConfiguracionAvatar, Usuario, Medalla, UsuarioMedalla } from 'src/app/core/models';
import { ReportarProblemaComponent } from 'src/app/shared/components/reportar-problema/reportar-problema.component';
import { AvatarPreviewComponent } from 'src/app/shared/components/avatar-preview/avatar-preview.component';
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
    IonToggle,
    IonSkeletonText,
    IonToast,
    ReportarProblemaComponent,
    AvatarPreviewComponent,
  ],
  templateUrl: './pagina-perfil.component.html',
  styleUrls: ['./pagina-perfil.component.scss'],
})
export class PaginaPerfilComponent {
  usuario: Usuario | null = null;
  configuracionAvatar: ConfiguracionAvatar | null = null;
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
    private avatarService: AvatarService,
    private themeService: Theme,
    private router: Router
  ) {
    addIcons({
      settingsOutline,
      helpCircleOutline,
      logOutOutline,
      chevronForwardOutline,
      moonOutline,
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


  async ionViewWillEnter() {
    const usuario = await this.authService.obtenerUsuarioActual();

    if (usuario?.id_usuario !== this.usuario?.id_usuario) {
      this.reiniciarEstado();
    }

    this.usuario = usuario;
    if (!usuario) {
      this.cargando = false;
      return;
    }

    await this.cargarEstadisticas(usuario);
    this.cargarConfiguracionAvatar();
  }

  private reiniciarEstado() {
    this.cargando = true;
    this.configuracionAvatar = null;
    this.totalLugaresVisitados = null;
    this.totalCategoriasVisitadas = null;
    this.totalMedallas = 0;
    this.medallasRecientes = [];
  }

  private async cargarEstadisticas(usuario: Usuario) {
    try {
      const [totalLugares, totalCategorias, medallasObtenidas, categorias] = await Promise.all([
        this.gamificacionService.contarLugaresVisitados(usuario.id_usuario),
        this.gamificacionService.contarCategoriasVisitadas(usuario.id_usuario),
        this.gamificacionService.listarMedallasDeUsuario(usuario.id_usuario) as Promise<
          MedallaObtenida[]
        >,
        this.categoriasService.listar(),
      ]);

      if (this.usuario?.id_usuario !== usuario.id_usuario) return;

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
      if (this.usuario?.id_usuario === usuario.id_usuario) {
        this.cargando = false;
      }
    }
  }

  private async cargarConfiguracionAvatar() {
    const idUsuario = this.usuario?.id_usuario;
    if (!idUsuario) return;
    try {
      const configuracion = await this.avatarService.obtenerConfiguracion(idUsuario);
      // Si se cambió de cuenta mientras cargaba, no se pisa con el avatar de la anterior.
      if (this.usuario?.id_usuario === idUsuario) {
        this.configuracionAvatar = configuracion;
      }
    } catch {
      // Si falla, se muestra el círculo con la inicial del nombre como respaldo.
    }
  }

  get modoOscuro(): boolean {
    return this.themeService.modoOscuro;
  }

  alternarModoOscuro(evento: ToggleCustomEvent) {
    this.themeService.establecerModoOscuro(evento.detail.checked);
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