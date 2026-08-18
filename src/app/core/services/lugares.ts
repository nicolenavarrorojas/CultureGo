import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Lugar } from '../models';

export interface FiltrosLugar {
  id_categoria?: string;
  id_comuna?: string;
  soloGratuitos?: boolean;
  cercaDeMi?: { lat: number; lng: number; radioMetros: number };
  texto?: string;
}

/**
 * Catálogo de lugares (filtrable por categoría, comuna, gratuidad)
 * + soporte para el mapa interactivo con filtros.
 *
 * La búsqueda "cerca de mí" se apoya en PostGIS, vía una función RPC
 * en Supabase, ej. `lugares_cercanos(lat, lng, radio_m)`.
 */
@Injectable({
  providedIn: 'root',
})
export class Lugares {
  private supabase = inject(Supabase).client;

  async listar(filtros: FiltrosLugar = {}): Promise<Lugar[]> {
    let query = this.supabase.from('lugar').select('*, categoria(*), comuna(*)');

    if (filtros.id_categoria) query = query.eq('id_categoria', filtros.id_categoria);
    if (filtros.id_comuna) query = query.eq('id_comuna', filtros.id_comuna);
    if (filtros.soloGratuitos) query = query.eq('es_gratuito', true);
    if (filtros.texto) query = query.ilike('nombre', `%${filtros.texto}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data as Lugar[];
  }

  async obtenerPorId(idLugar: string): Promise<Lugar> {
    const { data, error } = await this.supabase
      .from('lugar')
      .select('*, categoria(*), comuna(*)')
      .eq('id_lugar', idLugar)
      .single();
    if (error) throw error;
    return data as Lugar;
  }

  /** Requiere la función RPC PostGIS `lugares_cercanos` en Supabase. */
  async listarCercanos(lat: number, lng: number, radioMetros = 2000): Promise<Lugar[]> {
    const { data, error } = await this.supabase.rpc('lugares_cercanos', {
      lat,
      lng,
      radio_m: radioMetros,
    });
    if (error) throw error;
    return data as Lugar[];
  }
}