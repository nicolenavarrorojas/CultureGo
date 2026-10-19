export interface Reporte {
  id_reporte: string;
  id_usuario: string;
  id_lugar?: string | null; 
  tipo: 'error_lugar' | 'error_app' | 'sugerencia';
  descripcion: string;
  fecha_creacion: string;
  estado: 'pendiente' | 'en_revision' | 'resuelto' | 'rechazado';

  lugar?: { nombre: string } | null;
}