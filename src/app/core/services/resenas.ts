import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Resena } from '../models';

export interface DatosResena {
  id_usuario: string;
  id_lugar: string;
  calificacion: number;
  comentario?: string | null;
}

/**
 * Reseñas de lugares. Una por usuario por lugar (ver constraint
 * resena_unica_por_usuario_lugar) -- guardar() hace upsert sobre esa
 * restricción: si ya existe, la actualiza en vez de duplicarla.
 */
@Injectable({
  providedIn: 'root',
})
export class Resenas {
  private supabase = inject(Supabase).client;

  async listarPorLugar(idLugar: string): Promise<Resena[]> {
    // No se usa un join directo a "usuario" acá porque su política RLS
    // solo deja leer la propia fila -- el nombre del autor de una reseña
    // ajena saldría null. fn_listar_resenas_lugar (security definer)
    // resuelve esto exponiendo solo el nombre, nada más de esa tabla.
    const { data, error } = await this.supabase.rpc('fn_listar_resenas_lugar', {
      p_id_lugar: idLugar,
    });
    if (error) throw error;

    return (data ?? []).map((fila: any) => ({
      id_resena: fila.id_resena,
      id_usuario: fila.id_usuario,
      id_lugar: fila.id_lugar,
      calificacion: fila.calificacion,
      comentario: fila.comentario,
      fecha_creacion: fila.fecha_creacion,
      moderada: fila.moderada,
      usuario: { nombre: fila.nombre_usuario },
    })) as Resena[];
  }

  async obtenerMiResena(idLugar: string, idUsuario: string): Promise<Resena | null> {
    const { data, error } = await this.supabase
      .from('resena')
      .select('*')
      .eq('id_lugar', idLugar)
      .eq('id_usuario', idUsuario)
      .maybeSingle();
    if (error) throw error;
    return data as Resena | null;
  }

  async guardar(datos: DatosResena): Promise<Resena> {
    const { data, error } = await this.supabase
      .from('resena')
      .upsert(datos, { onConflict: 'id_usuario,id_lugar' })
      .select()
      .single();
    if (error) throw error;
    return data as Resena;
  }
}