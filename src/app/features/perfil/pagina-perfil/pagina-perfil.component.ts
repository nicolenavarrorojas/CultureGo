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
} from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Usuario, Medalla, UsuarioMedalla } from 'src/app/core/models';
import { ReportarProblemaComponent } from 'src/app/shared/components/reportar-problema/reportar-problema.component';

type MedallaObtenida = UsuarioMedalla & { medalla: Medalla };

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
  medallasRecientes: Medalla[] = [];

  toastMensaje = '';
  mostrarToast = false;
  mostrarReporte = false;

  constructor(
    private authService: Auth,
    private gamificacionService: Gamificacion,
    private router: Router
  ) {
    addIcons({
      settingsOutline,
      helpCircleOutline,
      logOutOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      receiptOutline,
    });
  }

  async ngOnInit() {
    this.cargando = true;
    try {

      this.usuario = await this.authService.obtenerUsuarioActual();
      if (!this.usuario) return;

      const [totalLugares, totalCategorias, medallasObtenidas] = await Promise.all([
        this.gamificacionService.contarLugaresVisitados(this.usuario.id_usuario),
        this.gamificacionService.contarCategoriasVisitadas(this.usuario.id_usuario),
        this.gamificacionService.listarMedallasDeUsuario(this.usuario.id_usuario) as Promise<
          MedallaObtenida[]
        >,
      ]);

      this.totalLugaresVisitados = totalLugares;
      this.totalCategoriasVisitadas = totalCategorias;

      this.totalMedallas = medallasObtenidas.length;

      const ordenadas = [...medallasObtenidas].sort(
        (a, b) => new Date(b.fecha_obtencion).getTime() - new Date(a.fecha_obtencion).getTime()
      );
      this.medallasRecientes = ordenadas.slice(0, LIMITE_MEDALLAS_RECIENTES).map((um) => um.medalla);
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