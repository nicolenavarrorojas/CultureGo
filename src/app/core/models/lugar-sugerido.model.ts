import { Categoria } from './categoria.model';

export interface LugarSugerido {
  id_lugar_sugerido: string;
  id_usuario: string;
  nombre: string;
  id_categoria: string | null;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  direccion?: string | null; // la escribe el usuario o se obtiene de su ubicación actual
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_creacion: string;
  revisado_por: string | null;
  fecha_revision: string | null;

  categoria?: Categoria;
}