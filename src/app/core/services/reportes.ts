import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Reporte } from '../models';

export interface NuevoReporte {
  id_usuario: string;
  id_lugar?: string | null;
  tipo: Reporte['tipo'];
  descripcion: string;
}

/**
 * Creación de reportes por parte de cualquier usuario autenticado (errores
 * de un lugar, errores de la app, sugerencias).
 * La gestión de reportes (listar/resolver) vive en Admin, porque
 * esa parte sí está restringida a usuarios con es_admin = true.
 */
@Injectable({
  providedIn: 'root',
})
export class Reportes {
  private supabase = inject(Supabase).client;

  async crear(datos: NuevoReporte): Promise<Reporte> {
    const { data, error } = await this.supabase
      .from('reporte')
      .insert(datos)
      .select()
      .single();
    if (error) throw error;
    return data as Reporte;
  }
}