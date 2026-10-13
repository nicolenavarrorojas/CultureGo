import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, UrlTree } from '@angular/router';

import { Auth } from '../services/auth';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  let usuarioActual: { id_usuario: string; es_admin?: boolean } | null;
  let rechazoObtenerUsuario: any;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    usuarioActual = null;
    rechazoObtenerUsuario = undefined;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: () =>
              rechazoObtenerUsuario ? Promise.reject(rechazoObtenerUsuario) : Promise.resolve(usuarioActual),
          },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('UT-GRD-01 con sesión activa permite el acceso', async () => {
    usuarioActual = { id_usuario: 'abc-123' };
    const resultado = await executeGuard({} as any, { url: '/tabs/perfil' } as any);
    expect(resultado).toBeTrue();
  });

  it('UT-GRD-02 sin sesión redirige a /auth/login con redirectTo', async () => {
    usuarioActual = null;
    const resultado = (await executeGuard({} as any, { url: '/tabs/perfil' } as any)) as UrlTree;
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(resultado.toString()).toContain('/auth/login');
    expect(resultado.queryParams['redirectTo']).toBe('/tabs/perfil');
  });

  it('UT-GRD-03 conserva la URL completa (con query) en redirectTo', async () => {
    usuarioActual = null;
    const resultado = (await executeGuard(
      {} as any,
      { url: '/perfil/historial?tab=medallas' } as any
    )) as UrlTree;
    expect(resultado.queryParams['redirectTo']).toBe('/perfil/historial?tab=medallas');
  });

  it('UT-GRD-04 un error de red en obtenerUsuarioActual no debería tumbar el guard', async () => {
    rechazoObtenerUsuario = { message: 'Failed to fetch' };
    let resultado: any;
    let lanzo = false;
    try {
      resultado = await executeGuard({} as any, { url: '/tabs/perfil' } as any);
    } catch {
      lanzo = true;
    }
    expect(lanzo).toBeFalse();
    expect(resultado instanceof UrlTree).toBeTrue();
  });
});
