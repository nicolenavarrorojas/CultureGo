import { Categoria } from './categoria.model';

export interface LugarSugerido {
  id_lugar_sugerido: string;
  id_usuario: string;
  nombre: string;
  id_categoria: string | null;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_creacion: string;
  revisado_por: string | null;
  fecha_revision: string | null;

  categoria?: Categoria;
}