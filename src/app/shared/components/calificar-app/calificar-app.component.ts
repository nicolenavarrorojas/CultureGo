import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, paperPlaneOutline, star, starOutline } from 'ionicons/icons';

import { CalificacionesApp } from 'src/app/core/services/calificaciones-app';
import { Auth } from 'src/app/core/services/auth';

export const LARGO_MAXIMO_COMENTARIO = 500;

// Calificación de la app en sí (botón "Califica la app" en Perfil).
// No tiene relación con las reseñas de lugares.
@Component({
  selector: 'app-calificar-app',
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
    IonToast,
  ],
  templateUrl: './calificar-app.component.html',
  styleUrls: ['./calificar-app.component.scss'],
})
export class CalificarAppComponent implements OnChanges {
  @Input() abierto = false;
  @Output() cerrado = new EventEmitter<void>();

  readonly estrellas = [1, 2, 3, 4, 5];
  readonly largoMaximo = LARGO_MAXIMO_COMENTARIO;

  calificacion = 0;
  comentario = '';
  yaCalifico = false;
  cargando = false;
  enviando = false;

  toastMensaje = '';
  mostrarToast = false;

  constructor(
    private calificacionesAppService: CalificacionesApp,
    private authService: Auth
  ) {
    addIcons({ closeOutline, paperPlaneOutline, star, starOutline });
  }

  ngOnChanges(cambios: SimpleChanges) {
    if (cambios['abierto'] && this.abierto) {
      this.cargarMiCalificacion();
    }
  }

  // Si ya calificó antes, se precargan su nota y comentario para editarlos.
  private async cargarMiCalificacion() {
    this.cargando = true;
    try {
      const usuario = await this.authService.obtenerUsuarioActual();
      if (!usuario) return;

      const existente = await this.calificacionesAppService.obtenerMia(usuario.id_usuario);
      this.yaCalifico = !!existente;
      this.calificacion = existente?.calificacion ?? 0;
      this.comentario = existente?.comentario ?? '';
    } catch (error) {
      console.error('Error al cargar calificación de la app:', error);
    } finally {
      this.cargando = false;
    }
  }

  seleccionarEstrella(valor: number) {
    this.calificacion = valor;
  }

  get formularioValido(): boolean {
    return (
      this.calificacion >= 1 &&
      this.calificacion <= 5 &&
      this.comentario.trim().length <= LARGO_MAXIMO_COMENTARIO
    );
  }

  async enviar() {
    if (!this.formularioValido || this.enviando) return;

    this.enviando = true;
    try {
      const usuario = await this.authService.obtenerUsuarioActual();
      if (!usuario) {
        this.mostrarAviso('Inicia sesión para calificar la app.');
        return;
      }

      await this.calificacionesAppService.guardar({
        id_usuario: usuario.id_usuario,
        calificacion: this.calificacion,
        comentario: this.comentario.trim() || null,
      });

      this.yaCalifico = true;
      this.mostrarAviso('¡Gracias por tu opinión!');
      setTimeout(() => this.cerrar(), 1200);
    } catch (error) {
      console.error('Error al guardar calificación de la app:', error);
      this.mostrarAviso('No se pudo enviar tu opinión. Intenta de nuevo.');
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
