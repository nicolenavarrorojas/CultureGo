import { Categoria } from './categoria.model';
import { Comuna } from './comuna.model';

export interface Lugar {
  id_lugar: string;
  nombre: string;
  descripcion_resumida: string;
  id_categoria: string;
  id_comuna: string;
  es_gratuito: boolean;
  latitud: number;
  longitud: number;
  url_imagen_principal?: string | null;
  direccion?: string | null;
  horario?: string | null;
  creado_por?: string | null; // id_usuario del admin que lo creó
  fecha_creacion: string;

  // Relaciones opcionales
  categoria?: Categoria;
  comuna?: Comuna;
}

/** (Pendiente): tabla para múltiples imágenes por lugar. */
export interface LugarImagen {
  id_lugar_imagen: string;
  id_lugar: string;
  url_imagen: string;
  orden: number;
}