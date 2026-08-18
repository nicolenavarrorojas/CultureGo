import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Lugar, Reporte } from '../models';

/**
 * Panel administrador: CRUD de lugares + gestión de reportes.
 * Administrador hereda de Usuario en el diagrama de clases, con crearLugar(), editarLugar(), eliminarLugar(), gestionarReportes().
 * deben restringir estas operaciones
 * a usuarios con es_admin = true.
 */
@Injectable({
  providedIn: 'root',
})
export class Admin {
  private supabase = inject(Supabase).client;

  async crearLugar(lugar: Partial<Lugar>): Promise<Lugar> {
    const { data, error } = await this.supabase.from('lugar').insert(lugar).select().single();
    if (error) throw error;
    return data as Lugar;
  }

  async editarLugar(idLugar: string, cambios: Partial<Lugar>): Promise<Lugar> {
    const { data, error } = await this.supabase
      .from('lugar')
      .update(cambios)
      .eq('id_lugar', idLugar)
      .select()
      .single();
    if (error) throw error;
    return data as Lugar;
  }

  async eliminarLugar(idLugar: string): Promise<void> {
    const { error } = await this.supabase.from('lugar').delete().eq('id_lugar', idLugar);
    if (error) throw error;
  }

  async listarReportes(soloNoResueltos = true): Promise<Reporte[]> {
    let query = this.supabase.from('reporte').select('*');
    if (soloNoResueltos) query = query.eq('resuelto', false);
    const { data, error } = await query;
    if (error) throw error;
    return data as Reporte[];
  }

  async resolverReporte(idReporte: string): Promise<void> {
    const { error } = await this.supabase
      .from('reporte')
      .update({ resuelto: true })
      .eq('id_reporte', idReporte);
    if (error) throw error;
  }
}