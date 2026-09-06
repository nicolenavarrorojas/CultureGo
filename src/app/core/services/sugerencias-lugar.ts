import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { LugarSugerido } from '../models';

export interface NuevaSugerenciaLugar {
  id_usuario: string;
  nombre: string;
  id_categoria: string;
  descripcion?: string | null;
  latitud: number;
  longitud: number;
}

/**
 * Sugerencias de lugares nuevos hechas por usuarios comunes (pin en el
 * mapa + nombre + categoría + descripción). El admin las revisa en
 * gestion-lugares y, si aprueba, usa estos datos para precargar el
 * formulario de "Nuevo lugar" (ver Admin.marcarSugerenciaRevisada).
 */
@Injectable({
  providedIn: 'root',
})
export class SugerenciasLugar {
  private supabase = inject(Supabase).client;

  async crear(datos: NuevaSugerenciaLugar): Promise<LugarSugerido> {
    const { data, error } = await this.supabase
      .from('lugar_sugerido')
      .insert(datos)
      .select()
      .single();
    if (error) throw error;
    return data as LugarSugerido;
  }

  async listarMisSugerencias(idUsuario: string): Promise<LugarSugerido[]> {
    const { data, error } = await this.supabase
      .from('lugar_sugerido')
      .select('*, categoria(*)')
      .eq('id_usuario', idUsuario)
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data as LugarSugerido[];
  }
}