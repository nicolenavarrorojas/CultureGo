import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Tiempo visible antes del fundido (ms)
const DURACION_VISIBLE = 3900;
// Tiempo visible con "reducir movimiento" activo (ms)
const DURACION_VISIBLE_REDUCIDA = 700;
// Duración del fundido de salida (ms)
const DURACION_SALIDA = 450;

/**
 * Pantalla de bienvenida animada que se muestra una sola vez al abrir la app.
 */
@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent implements OnInit {
  visible = true;
  saliendo = false;

  ngOnInit() {
    const movimientoReducido =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const duracion = movimientoReducido ? DURACION_VISIBLE_REDUCIDA : DURACION_VISIBLE;

    setTimeout(() => {
      this.saliendo = true;
      // Se quita del DOM cuando termina el fundido, para no tapar la app.
      setTimeout(() => (this.visible = false), DURACION_SALIDA);
    }, duracion);
  }
}