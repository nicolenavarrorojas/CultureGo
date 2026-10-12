import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RUTA_AUTH } from './entorno';

export interface CuentaQa01 {
  id: string;
  email: string;
  password: string;
}

const RUTA_CADENA = resolve(RUTA_AUTH, 'cadena.json');

function leerTodo(): Record<string, unknown> {
  return existsSync(RUTA_CADENA) ? JSON.parse(readFileSync(RUTA_CADENA, 'utf8')) : {};
}

export function reiniciarCadena(): void {
  mkdirSync(RUTA_AUTH, { recursive: true });
  writeFileSync(RUTA_CADENA, '{}');
}

export function guardarEnCadena(clave: string, valor: unknown): void {
  writeFileSync(RUTA_CADENA, JSON.stringify({ ...leerTodo(), [clave]: valor }));
}

export function leerDeCadena<T>(clave: string): T | undefined {
  return leerTodo()[clave] as T | undefined;
}
