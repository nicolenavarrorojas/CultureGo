import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { ConfiguracionAvatar } from '../models';

/**
 * Configuración de personalización del avatar (cabeza, ojos, boca, cuerpo)
 * del usuario, persistida como columnas en `usuario`. La RLS de esa tabla
 * ya restringe la lectura/escritura a la propia fila del usuario.
 */
@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private supabase = inject(Supabase).client;

  async obtenerConfiguracion(idUsuario: string): Promise<ConfiguracionAvatar> {
    const { data, error } = await this.supabase
      .from('usuario')
      .select('avatar_cabeza, avatar_ojos, avatar_boca, avatar_cuerpo')
      .eq('id_usuario', idUsuario)
      .single();
    if (error) throw error;

    return {
      cabeza: data.avatar_cabeza,
      ojos: data.avatar_ojos,
      boca: data.avatar_boca,
      cuerpo: data.avatar_cuerpo,
    };
  }

  async guardarConfiguracion(idUsuario: string, config: ConfiguracionAvatar): Promise<void> {
    const { error } = await this.supabase
      .from('usuario')
      .update({
        avatar_cabeza: config.cabeza,
        avatar_ojos: config.ojos,
        avatar_boca: config.boca,
        avatar_cuerpo: config.cuerpo,
      })
      .eq('id_usuario', idUsuario);
    if (error) throw error;
  }
}
