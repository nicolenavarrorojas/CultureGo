export interface Medalla {
  id_medalla: string;
  nombre: string;
  descripcion: string;
  id_categoria?: string | null; // FK : medalla asociada a una categoria
  cantidad_requerida: number; // cantidad de visitas para obtenerla
  url_icono?: string | null;
}

/** Tabla intermedia N:M (USUARIO_MEDALLA). */
export interface UsuarioMedalla {
  id_usuario: string;
  id_medalla: string;
  fecha_obtencion: string;
}