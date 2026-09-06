import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

import { Reportes } from 'src/app/core/services/reportes';
import { Auth } from 'src/app/core/services/auth';
import { Lugar, Reporte } from 'src/app/core/models';

interface OpcionTipo {
  valor: Reporte['tipo'];
  etiqueta: string;
}

@Component({
  selector: 'app-reportar-problema',
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
  templateUrl: './reportar-problema.component.html',
  styleUrls: ['./reportar-problema.component.scss'],
})
export class ReportarProblemaComponent {
  // Si viene con lugar, el reporte queda ligado a ese lugar (detalle-lugar).
  // Si viene null, es un reporte general de la app (botón "Ayuda" en Perfil).
  @Input() lugar: Lugar | null = null;
  @Input() abierto = false;
  @Output() cerrado = new EventEmitter<void>();

  tipo: Reporte['tipo'] | null = null;
  descripcion = '';
  enviando = false;

  toastMensaje = '';
  mostrarToast = false;

  constructor(
    private reportesService: Reportes,
    private authService: Auth
  ) {
    addIcons({ closeOutline, paperPlaneOutline });
  }

  get opcionesTipo(): OpcionTipo[] {
    return this.lugar
      ? [
          { valor: 'error_lugar', etiqueta: 'Algo está mal en este lugar' },
          { valor: 'sugerencia', etiqueta: 'Sugerencia' },
        ]
      : [
          { valor: 'error_app', etiqueta: 'Algo no funciona en la app' },
          { valor: 'sugerencia', etiqueta: 'Sugerencia' },
        ];
  }

  get formularioValido(): boolean {
    return !!this.tipo && this.descripcion.trim().length >= 10;
  }

  async enviar() {
    if (!this.formularioValido || this.enviando) return;

    this.enviando = true;
    try {
      const usuario = await this.authService.obtenerUsuarioActual();
      if (!usuario) {
        this.mostrarAviso('Inicia sesión para enviar un reporte.');
        return;
      }

      await this.reportesService.crear({
        id_usuario: usuario.id_usuario,
        id_lugar: this.lugar?.id_lugar ?? null,
        tipo: this.tipo!,
        descripcion: this.descripcion.trim(),
      });

      this.mostrarAviso('¡Gracias! Tu reporte fue enviado.');
      this.descripcion = '';
      this.tipo = null;
      setTimeout(() => this.cerrar(), 1200);
    } catch (error) {
  console.error('Error al crear reporte:', error);
  this.mostrarAviso('No se pudo enviar el reporte. Intenta de nuevo.');
  } finally {
      this.enviando = false;
    }
  }

  cerrar() {
    this.cerrado.emit();
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}