/** Posición del dispositivo, con su precisión en metros. */
export interface UbicacionActual {
  latitud: number;
  longitud: number;
  precisionMetros: number;
}

export type MotivoErrorUbicacion = 'no-disponible' | 'denegado' | 'sin-senal' | 'tiempo';

export class UbicacionError extends Error {
  constructor(public readonly motivo: MotivoErrorUbicacion) {
    super(`Ubicación: ${motivo}`);
    this.name = 'UbicacionError';
  }
}

/**
 * Obtiene la ubicación actual con la API de geolocalización del navegador
 * (en Android la entrega la WebView de Capacitor).
 */
export function obtenerUbicacionActual(tiempoLimiteMs = 10000): Promise<UbicacionActual> {
  return new Promise((resolver, rechazar) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      rechazar(new UbicacionError('no-disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) =>
        resolver({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionMetros: posicion.coords.accuracy,
        }),
      (error) => {
        // Códigos de GeolocationPositionError: 1 permiso denegado, 2 sin señal, 3 tiempo agotado.
        const motivos: Record<number, MotivoErrorUbicacion> = { 1: 'denegado', 2: 'sin-senal', 3: 'tiempo' };
        rechazar(new UbicacionError(motivos[error.code] ?? 'sin-senal'));
      },
      { enableHighAccuracy: true, timeout: tiempoLimiteMs, maximumAge: 30000 }
    );
  });
}

/** Mensaje para el usuario según el motivo del error. */
export function mensajeErrorUbicacion(error: unknown): string {
  const motivo = error instanceof UbicacionError ? error.motivo : 'sin-senal';
  switch (motivo) {
    case 'no-disponible':
      return 'Este dispositivo no permite obtener la ubicación. Escribe la dirección o marca el punto en el mapa.';
    case 'denegado':
      return 'No diste permiso de ubicación. Puedes activarlo en Configuración, o escribir la dirección.';
    case 'tiempo':
      return 'No se pudo obtener tu ubicación a tiempo. Intenta de nuevo.';
    default:
      return 'No se pudo obtener tu ubicación. Intenta de nuevo o escribe la dirección.';
  }
}
