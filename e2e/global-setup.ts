import { ejecutarSeed } from './seed';
import { reiniciarCadena } from './support/cadena';
import { asegurarFixtures } from './support/fixtures';
import { guardarEstado } from './support/sesion';

export default async function globalSetup(): Promise<void> {
  await ejecutarSeed(false);
  reiniciarCadena();
  asegurarFixtures();
  for (const rol of ['u1', 'u2', 'adm'] as const) await guardarEstado(rol);
}
