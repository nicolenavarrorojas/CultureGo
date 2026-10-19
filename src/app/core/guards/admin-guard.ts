import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/** Protege las rutas de CRUD. */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const usuario = await auth.obtenerUsuarioActual();
  if (usuario?.es_admin) return true;

  return router.createUrlTree(['/admin/login-admin']);
};