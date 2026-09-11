import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Lugar, Reporte, LugarSugerido} from '../models';
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

  async listarReportes(estados?: Array<Reporte['estado']>): Promise<Reporte[]> {
    let query = this.supabase.from('reporte').select('*, lugar(nombre)');
    if (estados && estados.length) {
      query = query.in('estado', estados);
    }
    const { data, error } = await query.order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data as Reporte[];
  }
 
  async actualizarEstadoReporte(idReporte: string, estado: Reporte['estado']): Promise<void> {
    const { error } = await this.supabase
      .from('reporte')
      .update({ estado })
      .eq('id_reporte', idReporte);
    if (error) throw error;
  }

  async subirImagenLugar(archivo: File): Promise<string> {
    const extension = archivo.name.split('.').pop() ?? 'jpg';
    const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
 
    const { error } = await this.supabase.storage
      .from('lugares')
      .upload(nombreArchivo, archivo, { cacheControl: '3600', upsert: false });
    if (error) throw error;
 
    const { data } = this.supabase.storage.from('lugares').getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }
 
  /**
   * Borra un archivo del bucket "lugares" a partir de su ruta interna
   */
  async eliminarImagenLugar(rutaArchivo: string): Promise<void> {
    const { error } = await this.supabase.storage.from('lugares').remove([rutaArchivo]);
    if (error) throw error;
  }

  async listarSugerenciasLugar(soloPendientes = true): Promise<LugarSugerido[]> {
    let query = this.supabase.from('lugar_sugerido').select('*, categoria(*)');
    if (soloPendientes) {
      query = query.eq('estado', 'pendiente');
    }
    const { data, error } = await query.order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data as LugarSugerido[];
  }
 
  /**
   * Marca una sugerencia como aprobada o rechazada. Al aprobar, esto no
   * crea el lugar automáticamente, el admin lo aprueba 
   * para precargar el formulario de "Nuevo lugar" y revisarlo
   * antes de publicar (crearLugar() se llama aparte, como siempre).
   */
  async marcarSugerenciaRevisada(
    idSugerencia: string,
    idAdmin: string,
    estado: 'aprobado' | 'rechazado'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('lugar_sugerido')
      .update({ estado, revisado_por: idAdmin, fecha_revision: new Date().toISOString() })
      .eq('id_lugar_sugerido', idSugerencia);
    if (error) throw error;
  }
  
  async eliminarResena(idResena: string): Promise<void> {
    const { error } = await this.supabase.from('resena').delete().eq('id_resena', idResena);
    if (error) throw error;
  }
 
}