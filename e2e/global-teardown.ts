import { credenciales } from './support/entorno';
import { CuentaQa01, leerDeCadena } from './support/cadena';
import { admin, obtenerGuard } from './support/datos';

export default async function globalTeardown(): Promise<void> {
  const guard = await obtenerGuard();
  const protegidas = (['u1', 'u2', 'adm'] as const).map((rol) => credenciales(rol).email.toLowerCase());

  // QA-30: las calificaciones de la app de las cuentas de prueba no quedan guardadas.
  if (guard.idsCuentas.length) {
    await guard.ejecutar({
      tabla: 'calificacion_app',
      accion: 'delete',
      filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: guard.idsCuentas },
    });
  }

  const cuenta = leerDeCadena<CuentaQa01>('qa01');
  if (!cuenta) return;
  const { data } = await admin.auth.admin.getUserById(cuenta.id);
  if (!data.user) return;
  await guard.borrarCuentaAuth(cuenta.id, protegidas);
}
