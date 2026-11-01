import { Injectable, InjectionToken, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface ConfiguracionSupabase {
  url: string;
  anonKey: string;
}

/** URL y clave del proyecto. Las pruebas la reemplazan por valores ficticios. */
export const CONFIGURACION_SUPABASE = new InjectionToken<ConfiguracionSupabase>('CONFIGURACION_SUPABASE', {
  providedIn: 'root',
  factory: () => ({ url: environment.supabaseUrl, anonKey: environment.supabaseAnonKey }),
});

/**
 * Wrapper único sobre el cliente de Supabase. Todos los demás servicios inyectan esta clase en vez de crear su propio cliente.
 */
@Injectable({
  providedIn: 'root',
})
export class Supabase {
  private configuracion = inject(CONFIGURACION_SUPABASE);

  readonly client: SupabaseClient = createClient(this.configuracion.url, this.configuracion.anonKey);
}
