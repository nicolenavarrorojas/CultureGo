import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/** Protege rutas que requieren un usuario autenticado*/
export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Si falla la consulta (por ejemplo, sin red), se trata como sin sesión.
  const usuario = await auth.obtenerUsuarioActual().catch(() => null);
  if (usuario) return true;

  return router.createUrlTree(['/auth/login'], { queryParams: { redirectTo: state.url } });
};
