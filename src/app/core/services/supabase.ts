import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Wrapper único sobre el cliente de Supabase. Todos los demás servicios inyectan esta clase en vez de crear su propio cliente.
 */
@Injectable({
  providedIn: 'root',
})
export class Supabase {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );
}