import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Usuario } from '../models';

/**
 * Autenticación vía Supabase Auth.
 */
@Injectable({
  providedIn: 'root',
})
export class Auth {
  private supabase = inject(Supabase).client;

  async registrarse(email: string, password: string, nombre: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) throw error;
    return data;
  }

  async iniciarSesion(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async cerrarSesion() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async obtenerUsuarioActual(): Promise<Usuario | null> {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) return null;

    const { data: perfil, error } = await this.supabase
      .from('usuario')
      .select('*')
      .eq('id_usuario', data.user.id)
      .single();

    if (error) return null;
    return perfil as Usuario;
  }

  async recuperarPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/restablecer`,
    });
    if (error) throw error;
  }

  async actualizarPassword(nuevaPassword: string) {
    const { error } = await this.supabase.auth.updateUser({ password: nuevaPassword });
    if (error) throw error;
  }

  /** Edición de perfil */
  async actualizarPerfil(datos: Partial<Pick<Usuario, 'nombre'>>): Promise<Usuario> {
    const { data: sesion } = await this.supabase.auth.getUser();
    if (!sesion.user) throw new Error('No hay sesión activa.');
 
    const { data, error } = await this.supabase
      .from('usuario')
      .update(datos)
      .eq('id_usuario', sesion.user.id)
      .select()
      .single();
    if (error) throw error;
    return data as Usuario;
  }
 
  /**
   * Elimina la cuenta del usuario actual de forma permanente
   * Al borrar auth.users, la sesión local queda inválida
   */
  async eliminarCuenta(): Promise<void> {
    const { error } = await this.supabase.rpc('fn_eliminar_mi_cuenta');
    if (error) throw error;
  }

}