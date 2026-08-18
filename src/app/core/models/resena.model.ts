export interface Resena {
  id_resena: string;
  id_usuario: string;
  id_lugar: string;
  calificacion: number; // 1 a 5
  comentario?: string | null;
  fecha_creacion: string;
  moderada: boolean;
}