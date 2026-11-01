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

  private usuarioCache: Usuario | null | undefined = undefined;
  // Consulta en curso: si dos llamadas llegan a la vez, comparten la misma.
  private consultaEnCurso: Promise<Usuario | null> | null = null;
  // Aumenta con cada cambio de sesión; una consulta iniciada antes no se guarda en caché.
  private versionSesion = 0;

  constructor() {
    this.supabase.auth.onAuthStateChange(() => {
      this.usuarioCache = undefined;
      this.consultaEnCurso = null;
      this.versionSesion++;
    });
  }

  /**
   * Crea la cuenta. La aceptación de los Términos y condiciones viaja en
   * los metadatos del signUp y un trigger en la base la
   * guarda en usuario.terminos_aceptados_en con la hora.
   */
  async registrarse(email: string, password: string, nombre: string, aceptaTerminos: boolean) {
    if (!aceptaTerminos) {
      throw new Error('Debes aceptar los términos y condiciones para crear tu cuenta.');
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, terminos_aceptados: true } },
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
    if (this.consultaEnCurso) return this.consultaEnCurso;

    const consulta = this.consultarUsuarioActual();
    this.consultaEnCurso = consulta;
    try {
      return await consulta;
    } finally {
      // Si hubo un cambio de sesión mientras tanto, ya se limpió en onAuthStateChange.
      if (this.consultaEnCurso === consulta) this.consultaEnCurso = null;
    }
  }

  private async consultarUsuarioActual(): Promise<Usuario | null> {
    const version = this.versionSesion;

    const { data } = await this.supabase.auth.getUser();
    if (!data.user) {
      this.guardarEnCache(version, null);
      return null;
    }

    const { data: perfil, error } = await this.supabase
      .from('usuario')
      .select('*')
      .eq('id_usuario', data.user.id)
      .single();

    // Un error al leer el perfil no se guarda en caché: la siguiente llamada vuelve a consultar.
    if (error) return null;

    this.guardarEnCache(version, perfil as Usuario);
    return perfil as Usuario;
  }

  /** Solo guarda si no hubo un cambio de sesión mientras se consultaba. */
  private guardarEnCache(version: number, usuario: Usuario | null) {
    if (version === this.versionSesion) this.usuarioCache = usuario;
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

  /**
   * Comprueba que la contraseña ingresada sea la actual de la cuenta
   * Devuelve false si la contraseña es incorrecta.
   */
  async verificarPasswordActual(password: string): Promise<boolean> {
    const { data: sesion } = await this.supabase.auth.getUser();
    const email = sesion.user?.email;
    if (!email) throw new Error('No hay sesión activa.');

    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (!error) return true;

    if (error.status === 400 || /invalid login credentials/i.test(error.message)) return false;
    throw error;
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