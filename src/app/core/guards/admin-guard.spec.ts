import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, UrlTree } from '@angular/router';

import { Auth } from '../services/auth';
import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  let usuarioActual: { id_usuario: string; es_admin?: boolean | null } | null;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  beforeEach(() => {
    usuarioActual = null;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: () => Promise.resolve(usuarioActual),
          },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('UT-GRD-05 es_admin true permite el acceso', async () => {
    usuarioActual = { id_usuario: 'admin-1', es_admin: true };
    const resultado = await executeGuard({} as any, {} as any);
    expect(resultado).toBeTrue();
  });

  it('UT-GRD-06 autenticado con es_admin false redirige a /admin/login-admin', async () => {
    usuarioActual = { id_usuario: 'user-1', es_admin: false };
    const resultado = (await executeGuard({} as any, {} as any)) as UrlTree;
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(resultado.toString()).toContain('/admin/login-admin');
  });

  it('UT-GRD-07 sin sesión redirige a /admin/login-admin', async () => {
    usuarioActual = null;
    const resultado = (await executeGuard({} as any, {} as any)) as UrlTree;
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(resultado.toString()).toContain('/admin/login-admin');
  });

  it('UT-GRD-08 es_admin null o ausente se trata como no admin', async () => {
    usuarioActual = { id_usuario: 'user-1', es_admin: null };
    const resultadoNull = (await executeGuard({} as any, {} as any)) as UrlTree;
    expect(resultadoNull instanceof UrlTree).toBeTrue();

    usuarioActual = { id_usuario: 'user-1' };
    const resultadoAusente = (await executeGuard({} as any, {} as any)) as UrlTree;
    expect(resultadoAusente instanceof UrlTree).toBeTrue();
  });
});
