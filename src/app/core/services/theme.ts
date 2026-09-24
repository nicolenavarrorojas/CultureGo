import { Injectable } from '@angular/core';

const CLAVE_ALMACENAMIENTO = 'culturego-tema-oscuro';
const CLASE_TEMA_OSCURO = 'tema-oscuro';

/**
 * Modo oscuro manual de la app (no ligado a prefers-color-scheme).
 * La clase que aplica es la misma que agrega el script inline en
 * index.html antes del primer render, para no repetir la preferencia
 * guardada dos veces ni causar un parpadeo del tema incorrecto.
 */
@Injectable({
  providedIn: 'root',
})
export class Theme {
  private oscuro = document.documentElement.classList.contains(CLASE_TEMA_OSCURO);

  get modoOscuro(): boolean {
    return this.oscuro;
  }

  establecerModoOscuro(activo: boolean): void {
    this.oscuro = activo;
    document.documentElement.classList.toggle(CLASE_TEMA_OSCURO, activo);
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, String(activo));
    } catch {
      // Si localStorage no está disponible, el tema igual se aplica para
      // esta sesión; solo no persiste entre sesiones.
    }
  }
}
