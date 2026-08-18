export interface Reporte {
  id_reporte: string;
  id_usuario: string;
  id_lugar?: string | null; // nullable: puede ser un reporte de error de la app, no de un lugar
  tipo: 'error_lugar' | 'error_app' | 'sugerencia';
  descripcion: string;
  fecha_creacion: string;
  resuelto: boolean;
}