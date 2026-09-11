import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Medalla, UsuarioMedalla, Visita, Lugar} from '../models';

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

  /** Cantidad de lugares DISTINTOS que el usuario ha visitado. */
  async contarLugaresVisitados(idUsuario: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('visita')
      .select('id_lugar')
      .eq('id_usuario', idUsuario);
    if (error) throw error;
 
    const idsUnicos = new Set((data ?? []).map((v) => v.id_lugar));
    return idsUnicos.size;
  }

  /** Cantidad de categorías DISTINTAS que el usuario ha visitado. */
  async contarCategoriasVisitadas(idUsuario: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('visita')
      .select('lugar(id_categoria)')
      .eq('id_usuario', idUsuario);
    if (error) throw error;
 
    const idsUnicos = new Set(
      (data ?? [])
        .map((v: any) => v.lugar?.id_categoria)
        .filter((id: string | undefined) => !!id)
    );
    return idsUnicos.size;
  }
  /** Lugares visitados por el usuario, sin duplicados, más recientes primero. */
  async listarLugaresVisitados(
    idUsuario: string
  ): Promise<{ lugar: Lugar; fecha_visita: string }[]> {
    const { data, error } = await this.supabase
      .from('visita')
      .select('fecha_visita, lugar(*, categoria(*), comuna(*))')
      .eq('id_usuario', idUsuario)
      .order('fecha_visita', { ascending: false });
    if (error) throw error;
 
    const vistos = new Set<string>();
    const resultado: { lugar: Lugar; fecha_visita: string }[] = [];
    for (const fila of (data ?? []) as any[]) {
      const lugar = fila.lugar as Lugar;
      if (!lugar || vistos.has(lugar.id_lugar)) continue;
      vistos.add(lugar.id_lugar);
      resultado.push({ lugar, fecha_visita: fila.fecha_visita });
    }
    return resultado;
  }
 
  /**
   * Cantidad de visitas del usuario por categoría (cuenta TOTAL de visitas,
   * no lugares distintos 
   */
  async contarVisitasPorCategoria(idUsuario: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('visita')
      .select('id_lugar, lugar(id_categoria)')
      .eq('id_usuario', idUsuario);
    if (error) throw error;
 
    const lugaresPorCategoria: Record<string, Set<string>> = {};
    for (const fila of (data ?? []) as any[]) {
      const idCategoria = fila.lugar?.id_categoria;
      if (!idCategoria) continue;
      if (!lugaresPorCategoria[idCategoria]) lugaresPorCategoria[idCategoria] = new Set();
      lugaresPorCategoria[idCategoria].add(fila.id_lugar);
    }
 
    const conteo: Record<string, number> = {};
    for (const [idCategoria, lugares] of Object.entries(lugaresPorCategoria)) {
      conteo[idCategoria] = lugares.size;
    }
    return conteo;
  }
 
  async contarVisitasTotales(idUsuario: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('visita')
      .select('id_lugar')
      .eq('id_usuario', idUsuario);
    if (error) throw error;
    return new Set((data ?? []).map((v: any) => v.id_lugar)).size;
  }
}