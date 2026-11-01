import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { CalificacionApp } from '../models';

export interface DatosCalificacionApp {
  id_usuario: string;
  calificacion: number;
  comentario?: string | null;
}

/**
 * "Califica la app": opinión del usuario sobre el funcionamiento de CultureGo.
 * Separado de Resenas (que son de lugares) -- usa su propia tabla
 * calificacion_app, con una fila por usuario (unique id_usuario).
 * guardar() hace upsert: si ya calificó, actualiza en vez de duplicar.
 */
@Injectable({
  providedIn: 'root',
})
export class CalificacionesApp {
  private supabase = inject(Supabase).client;

  async obtenerMia(idUsuario: string): Promise<CalificacionApp | null> {
    const { data, error } = await this.supabase
      .from('calificacion_app')
      .select('*')
      .eq('id_usuario', idUsuario)
      .maybeSingle();
    if (error) throw error;
    return data as CalificacionApp | null;
  }

  async guardar(datos: DatosCalificacionApp): Promise<CalificacionApp> {
    const { data, error } = await this.supabase
      .from('calificacion_app')
      .upsert(
        { ...datos, fecha_actualizacion: new Date().toISOString() },
        { onConflict: 'id_usuario' }
      )
      .select()
      .single();
    if (error) throw error;
    return data as CalificacionApp;
  }
}
