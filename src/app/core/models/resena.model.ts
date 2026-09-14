export interface Resena {
  id_resena: string;
  id_usuario: string;
  id_lugar: string;
  calificacion: number; 
  comentario?: string | null;
  fecha_creacion: string;
  moderada: boolean;

  usuario?: { nombre: string } | null;
}