import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSkeletonText,
} from '@ionic/angular/standalone';

import { Auth } from 'src/app/core/services/auth';
import { Reportes } from 'src/app/core/services/reportes';
import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Reporte, LugarSugerido } from 'src/app/core/models';

type Segmento = 'reportes' | 'sugerencias';

const ETIQUETAS_ESTADO_REPORTE: Record<Reporte['estado'], string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
};

const ETIQUETAS_ESTADO_SUGERENCIA: Record<LugarSugerido['estado'], string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

@Component({
  selector: 'app-mis-tickets',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSkeletonText,
  ],
  templateUrl: './mis-tickets.component.html',
  styleUrls: ['./mis-tickets.component.scss'],
})
export class MisTicketsComponent implements OnInit {
  segmentoActivo: Segmento = 'reportes';
  cargando = true;

  misReportes: Reporte[] = [];
  misSugerencias: LugarSugerido[] = [];

  readonly etiquetasEstadoReporte = ETIQUETAS_ESTADO_REPORTE;
  readonly etiquetasEstadoSugerencia = ETIQUETAS_ESTADO_SUGERENCIA;

  constructor(
    private authService: Auth,
    private reportesService: Reportes,
    private sugerenciasService: SugerenciasLugar
  ) {}

  async ngOnInit() {
    this.cargando = true;
    try {
      const usuario = await this.authService.obtenerUsuarioActual();
      if (!usuario) return;

      const [reportes, sugerencias] = await Promise.all([
        this.reportesService.listarMisReportes(usuario.id_usuario),
        this.sugerenciasService.listarMisSugerencias(usuario.id_usuario),
      ]);

      this.misReportes = reportes;
      this.misSugerencias = sugerencias;
    } finally {
      this.cargando = false;
    }
  }

  cambiarSegmento(segmento: string | number | undefined) {
    if (segmento === 'reportes' || segmento === 'sugerencias') {
      this.segmentoActivo = segmento;
    }
  }
}