// Opinión del usuario sobre el funcionamiento de la app (no de un lugar).
// Independiente de Resena: tabla calificacion_app, una por usuario.
export interface CalificacionApp {
  id_calificacion: string;
  id_usuario: string;
  calificacion: number; // 1 a 5
  comentario?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}
