import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient, Session } from '@supabase/supabase-js';
import { BASE_URL, RUTA_AUTH, Rol, credenciales, rutaEstado, variable } from './entorno';

export interface SesionCapturada {
  session: Session;
  almacenamiento: { name: string; value: string }[];
}

export async function iniciarSesionApi(email: string, password: string): Promise<SesionCapturada> {
  const memoria = new Map<string, string>();
  const cliente = createClient(variable('SUPABASE_URL'), variable('SUPABASE_ANON_KEY'), {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      storage: {
        getItem: (clave) => memoria.get(clave) ?? null,
        setItem: (clave, valor) => void memoria.set(clave, valor),
        removeItem: (clave) => void memoria.delete(clave),
      },
    },
  });
  const { data, error } = await cliente.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión con ${email}: ${error?.message}`);
  return {
    session: data.session,
    almacenamiento: [...memoria].map(([name, value]) => ({ name, value })),
  };
}

export async function guardarEstado(rol: Rol): Promise<Session> {
  const { email, password } = credenciales(rol);
  const { session, almacenamiento } = await iniciarSesionApi(email, password);
  mkdirSync(RUTA_AUTH, { recursive: true });
  writeFileSync(
    rutaEstado(rol),
    JSON.stringify({ cookies: [], origins: [{ origin: BASE_URL, localStorage: almacenamiento }] })
  );
  return session;
}
