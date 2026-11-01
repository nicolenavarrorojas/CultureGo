import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/**
 * Protege las rutas de CRUD. Sin sesión se va al login (y vuelve al panel
 * después de entrar); con sesión pero sin ser admin, a Inicio.
 */
export const adminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const usuario = await auth.obtenerUsuarioActual().catch(() => null);
  if (usuario?.es_admin) return true;

  if (!usuario) {
    return router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } });
  }
  return router.createUrlTree(['/tabs/inicio']);
};
