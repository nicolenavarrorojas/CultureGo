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

  // undefined = todavía no se consultó en esta sesión de la app; null = se
  // consultó y no hay usuario logeado. Evita repetir auth.getUser() + el
  // select a `usuario` en cada guard/página que llama a obtenerUsuarioActual().
  private usuarioCache: Usuario | null | undefined = undefined;

  constructor() {
    // Login, logout y refresco de token invalidan la caché. Cubre también
    // cierres de sesión que no pasan por cerrarSesion() (ej. token expirado).
    this.supabase.auth.onAuthStateChange(() => {
      this.usuarioCache = undefined;
    });
  }

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
    if (this.usuarioCache !== undefined) return this.usuarioCache;

    const { data } = await this.supabase.auth.getUser();
    if (!data.user) {
      this.usuarioCache = null;
      return null;
    }

    const { data: perfil, error } = await this.supabase
      .from('usuario')
      .select('*')
      .eq('id_usuario', data.user.id)
      .single();

    this.usuarioCache = error ? null : (perfil as Usuario);
    return this.usuarioCache;
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

    this.usuarioCache = data as Usuario;
    return this.usuarioCache;
  }
 
  /**
   * Elimina la cuenta del usuario actual de forma permanente
   * Al borrar auth.users, la sesión local queda inválida
   */
  async eliminarCuenta(): Promise<void> {
    const { error } = await this.supabase.rpc('fn_eliminar_mi_cuenta');
    if (error) throw error;
    this.usuarioCache = undefined;
  }

}