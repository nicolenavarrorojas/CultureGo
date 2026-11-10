import { Injectable } from '@angular/core';

/** Una dirección encontrada, con sus coordenadas. */
export interface ResultadoDireccion {
  etiqueta: string;
  latitud: number;
  longitud: number;
}

export type MotivoErrorGeocodificacion = 'sin-conexion' | 'limite' | 'servicio' | 'tiempo';

/** Error de la geocodificación, con un motivo que la interfaz traduce a un mensaje. */
export class GeocodificacionError extends Error {
  constructor(public readonly motivo: MotivoErrorGeocodificacion) {
    super(`Geocodificación: ${motivo}`);
    this.name = 'GeocodificacionError';
  }
}

const URL_NOMINATIM = 'https://nominatim.openstreetmap.org';

// Zona de búsqueda: Santiago y alrededores (oeste, norte, este, sur).
// El catálogo cubre solo comunas de Santiago (ERS 2.4).
const ZONA_SANTIAGO = '-71.05,-33.20,-70.35,-33.80';

// La política de uso de Nominatim permite como máximo 1 solicitud por segundo
// y prohíbe autocompletar mientras se escribe: la búsqueda se hace con un botón.
const ESPERA_MINIMA_MS = 1000;
const TIEMPO_LIMITE_MS = 8000;
const MAX_RESULTADOS = 5;

interface RespuestaNominatim {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Convierte direcciones en coordenadas y viceversa con Nominatim
 * (servicio gratuito de OpenStreetMap, el mismo proveedor de las teselas del mapa).
 */
@Injectable({
  providedIn: 'root',
})
export class Geocodificacion {
  private ultimaSolicitud = 0;

  /** Busca una dirección en Santiago. Devuelve hasta 5 resultados, o una lista vacía. */
  async buscar(texto: string): Promise<ResultadoDireccion[]> {
    const consulta = texto.trim();
    if (!consulta) return [];

    const parametros = new URLSearchParams({
      q: consulta,
      format: 'jsonv2',
      countrycodes: 'cl',
      viewbox: ZONA_SANTIAGO,
      bounded: '1',
      limit: String(MAX_RESULTADOS),
      'accept-language': 'es',
    });
    const datos = await this.solicitar<RespuestaNominatim[]>(`/search?${parametros}`);
    return datos.map((d) => this.aResultado(d)).filter((r): r is ResultadoDireccion => r !== null);
  }

  /** Dirección aproximada de unas coordenadas, o null si no hay ninguna. */
  async direccionDe(latitud: number, longitud: number): Promise<string | null> {
    const parametros = new URLSearchParams({
      lat: String(latitud),
      lon: String(longitud),
      format: 'jsonv2',
      zoom: '18',
      'accept-language': 'es',
    });
    const dato = await this.solicitar<Partial<RespuestaNominatim> & { error?: string }>(`/reverse?${parametros}`);
    return dato && !dato.error && dato.display_name ? this.acortar(dato.display_name) : null;
  }

  private async solicitar<T>(ruta: string): Promise<T> {
    await this.respetarEspera();

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
    let respuesta: Response;
    try {
      respuesta = await fetch(`${URL_NOMINATIM}${ruta}`, {
        headers: { Accept: 'application/json' },
        signal: controlador.signal,
      });
    } catch {
      throw new GeocodificacionError(controlador.signal.aborted ? 'tiempo' : 'sin-conexion');
    } finally {
      clearTimeout(temporizador);
    }

    if (respuesta.status === 429) throw new GeocodificacionError('limite');
    if (!respuesta.ok) throw new GeocodificacionError('servicio');
    try {
      return (await respuesta.json()) as T;
    } catch {
      throw new GeocodificacionError('servicio');
    }
  }

  /** Espera lo necesario para no hacer más de una solicitud por segundo. */
  private async respetarEspera() {
    const espera = this.ultimaSolicitud + ESPERA_MINIMA_MS - Date.now();
    if (espera > 0) await new Promise((resolver) => setTimeout(resolver, espera));
    this.ultimaSolicitud = Date.now();
  }

  private aResultado(dato: RespuestaNominatim): ResultadoDireccion | null {
    const latitud = Number(dato.lat);
    const longitud = Number(dato.lon);
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null;
    return { etiqueta: this.acortar(dato.display_name), latitud, longitud };
  }

  /** Quita del final las partes que se repiten en todos los resultados (provincia, región, código postal, país). */
  private acortar(nombre: string): string {
    const partes = nombre.split(',').map((p) => p.trim()).filter(Boolean);
    while (partes.length > 1) {
      const ultima = partes[partes.length - 1];
      if (/^chile$/i.test(ultima) || /^\d{5,7}$/.test(ultima) || /^(regi[oó]n|provincia)\b/i.test(ultima)) partes.pop();
      else break;
    }
    return partes.join(', ');
  }
}

/** Mensaje para el usuario según el motivo del error. */
export function mensajeErrorGeocodificacion(error: unknown): string {
  const motivo = error instanceof GeocodificacionError ? error.motivo : 'servicio';
  switch (motivo) {
    case 'sin-conexion':
      return 'No hay conexión a internet. Revisa tu red e intenta de nuevo.';
    case 'limite':
      return 'El buscador de direcciones está ocupado. Espera unos segundos e intenta de nuevo.';
    case 'tiempo':
      return 'El buscador de direcciones tardó demasiado. Intenta de nuevo.';
    default:
      return 'No se pudo buscar la dirección. Intenta de nuevo o marca el punto en el mapa.';
  }
}
