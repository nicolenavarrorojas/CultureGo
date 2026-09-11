export interface ColorTema {
  solido: string;
  tenue: string;
  texto: string;
}

export const COLORES_POR_NOMBRE: Record<string, ColorTema> = {
  museo: { solido: '#6B4FA0', tenue: '#E3DCF2', texto: '#4A3670' },
  teatro: { solido: '#C1622D', tenue: '#F3DDCB', texto: '#7A3A1B' },
  parque: { solido: '#3E9142', tenue: '#DCEADF', texto: '#2F4F3A' },
  cerro: { solido: '#5A8A6E', tenue: '#DCEADF', texto: '#2F4F3A' },
  'edificio patrimonial': { solido: '#9B5B3F', tenue: '#EEDDD3', texto: '#5F3421' },
  iglesia: { solido: '#8E5A9E', tenue: '#EBDCEF', texto: '#5A3866' },
  biblioteca: { solido: '#2E6E8E', tenue: '#D7E7EC', texto: '#1D4658' },
  cine: { solido: '#4A3F73', tenue: '#DDD9EC', texto: '#2E2650' },
  'galería de arte': { solido: '#C9A227', tenue: '#FBEACB', texto: '#7A5A0F' },
};


export const ICONOS_POR_NOMBRE: Record<string, string> = {
  museo: 'color-palette-outline',
  teatro: 'ticket-outline',
  parque: 'leaf-outline',
  cerro: 'trail-sign-outline',
  'edificio patrimonial': 'business-outline',
  iglesia: 'flame-outline',
  biblioteca: 'book-outline',
  cine: 'film-outline',
  'galería de arte': 'images-outline',
};

const PALETA_RESPALDO: ColorTema[] = [
  { solido: '#6B4FA0', tenue: '#E3DCF2', texto: '#4A3670' },
  { solido: '#C1622D', tenue: '#F3DDCB', texto: '#7A3A1B' },
  { solido: '#5A8A6E', tenue: '#DCEADF', texto: '#2F4F3A' },
  { solido: '#C9A227', tenue: '#FBEACB', texto: '#7A5A0F' },
  { solido: '#2E6E8E', tenue: '#D7E7EC', texto: '#1D4658' },
  { solido: '#8E5A9E', tenue: '#EBDCEF', texto: '#5A3866' },
];

const ICONO_RESPALDO = 'ribbon-outline';

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const colorPorIdDesconocido = new Map<string, ColorTema>();


export function obtenerColorCategoria(
  nombre: string | null | undefined,
  idCategoria?: string | null
): ColorTema {
  if (nombre) {
    const clave = normalizarNombre(nombre);
    if (COLORES_POR_NOMBRE[clave]) return COLORES_POR_NOMBRE[clave];
  }
  if (idCategoria) {
    if (!colorPorIdDesconocido.has(idCategoria)) {
      let hash = 0;
      for (let i = 0; i < idCategoria.length; i++) {
        hash = (hash * 31 + idCategoria.charCodeAt(i)) >>> 0;
      }
      colorPorIdDesconocido.set(idCategoria, PALETA_RESPALDO[hash % PALETA_RESPALDO.length]);
    }
    return colorPorIdDesconocido.get(idCategoria)!;
  }
  return PALETA_RESPALDO[0];
}


export function obtenerIconoCategoria(nombre: string | null | undefined): string {
  if (!nombre) return ICONO_RESPALDO;
  const clave = normalizarNombre(nombre);
  return ICONOS_POR_NOMBRE[clave] ?? ICONO_RESPALDO;
}