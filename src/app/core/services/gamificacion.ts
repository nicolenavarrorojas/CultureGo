import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Medalla, UsuarioMedalla, Visita } from '../models';

/**
 * Sistema de gamificación (mascota, medallas).
 * El otorgamiento automático de medallas se resuelve con una función/trigger
 * en Supabase (Postgres function) al insertar una VISITA, comparando contra
 * MEDALLA.cantidad_requerida (y MEDALLA.id_categoria si aplica).
 */
@Injectable({
  providedIn: 'root',
})
export class Gamificacion {
  private supabase = inject(Supabase).client;

  async registrarVisita(idUsuario: string, idLugar: string): Promise<Visita> {
    const { data, error } = await this.supabase
      .from('visita')
      .insert({ id_usuario: idUsuario, id_lugar: idLugar })
      .select()
      .single();
    if (error) throw error;
    return data as Visita;
  }

  async listarMedallasDeUsuario(idUsuario: string): Promise<(UsuarioMedalla & { medalla: Medalla })[]> {
    const { data, error } = await this.supabase
      .from('usuario_medalla')
      .select('*, medalla(*)')
      .eq('id_usuario', idUsuario);
    if (error) throw error;
    return data as (UsuarioMedalla & { medalla: Medalla })[];
  }

  async listarTodasLasMedallas(): Promise<Medalla[]> {
    const { data, error } = await this.supabase.from('medalla').select('*');
    if (error) throw error;
    return data as Medalla[];
  }
}