import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const RUTA_ENV = resolve(__dirname, '..', '..', '.env.e2e');
export const RUTA_SEED_INFO = resolve(__dirname, '..', '.seed-info.json');
export const RUTA_AUTH = resolve(__dirname, '..', '.auth');
export const PREFIJO = 'E2E-';
export const BASE_URL = 'http://localhost:8100';

export type Rol = 'u1' | 'u2' | 'adm';

export interface SeedInfo {
  medalla: { id_medalla: string; nombre: string; cantidad_requerida: number };
  lugares: { id_lugar: string; nombre: string }[];
}

dotenv.config({ path: RUTA_ENV, quiet: true });

export function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable ${nombre} en .env.e2e`);
  return valor;
}

export function credenciales(rol: Rol): { email: string; password: string } {
  const sufijo = rol.toUpperCase();
  return { email: variable(`E2E_${sufijo}_EMAIL`), password: variable(`E2E_${sufijo}_PASS`) };
}

export function correosDePrueba(): string[] {
  return (['u1', 'u2', 'adm'] as Rol[]).map((rol) => credenciales(rol).email.toLowerCase());
}

export function esCorreoDePrueba(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().includes(variable('E2E_EMAIL_PATTERN').toLowerCase());
}

const opcionesSinSesion = { auth: { persistSession: false, autoRefreshToken: false } };

export function clienteAdmin(): SupabaseClient {
  return createClient(variable('SUPABASE_URL'), variable('SUPABASE_SERVICE_ROLE_KEY'), opcionesSinSesion);
}

export function clienteAnonimo(): SupabaseClient {
  return createClient(variable('SUPABASE_URL'), variable('SUPABASE_ANON_KEY'), opcionesSinSesion);
}

export function leerSeedInfo(): SeedInfo {
  return JSON.parse(readFileSync(RUTA_SEED_INFO, 'utf8')) as SeedInfo;
}

export function rutaEstado(rol: Rol): string {
  return resolve(RUTA_AUTH, `${rol}.json`);
}

export function actualizarEnv(valores: Record<string, string>): void {
  const lineas = readFileSync(RUTA_ENV, 'utf8').split(/\r?\n/);
  const pendientes = new Map(Object.entries(valores));
  const resultado = lineas.map((linea) => {
    const clave = linea.match(/^([A-Z0-9_]+)=/)?.[1];
    if (clave && pendientes.has(clave)) {
      const valor = pendientes.get(clave)!;
      pendientes.delete(clave);
      return `${clave}=${valor}`;
    }
    return linea;
  });
  if (resultado[resultado.length - 1] === '') resultado.pop();
  for (const [clave, valor] of pendientes) resultado.push(`${clave}=${valor}`);
  writeFileSync(RUTA_ENV, resultado.join('\n') + '\n');
  for (const [clave, valor] of Object.entries(valores)) process.env[clave] = valor;
}
