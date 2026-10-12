import { credenciales } from './support/entorno';
import { CuentaQa01, leerDeCadena } from './support/cadena';
import { admin, obtenerGuard } from './support/datos';

export default async function globalTeardown(): Promise<void> {
  const cuenta = leerDeCadena<CuentaQa01>('qa01');
  if (!cuenta) return;
  const { data } = await admin.auth.admin.getUserById(cuenta.id);
  if (!data.user) return;
  const protegidas = (['u1', 'u2', 'adm'] as const).map((rol) => credenciales(rol).email.toLowerCase());
  await (await obtenerGuard()).borrarCuentaAuth(cuenta.id, protegidas);
}
