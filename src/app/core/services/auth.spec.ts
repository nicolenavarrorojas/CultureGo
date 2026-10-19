import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';
import { Supabase } from './supabase';

describe('Auth', () => {
  let service: Auth;
  let authStateCallback: ((event: string, session: unknown) => void) | undefined;

  let usuarioAuth: { id: string } | null;
  let colaRespuestasPerfil: Array<{ data: any; error: any }>;

  let getUserSpy: jasmine.Spy;
  let selectSpy: jasmine.Spy;
  let eqSpy: jasmine.Spy;
  let singleSpy: jasmine.Spy;
  let updateSpy: jasmine.Spy;
  let fromSpy: jasmine.Spy;
  let signUpSpy: jasmine.Spy;
  let signInWithPasswordSpy: jasmine.Spy;
  let signOutSpy: jasmine.Spy;
  let rpcSpy: jasmine.Spy;

  function siguienteRespuesta() {
    return colaRespuestasPerfil.length > 1 ? colaRespuestasPerfil.shift()! : colaRespuestasPerfil[0];
  }

  function crearQueryBuilder(): any {
    const builder: any = {
      select: selectSpy.and.callFake(() => builder),
      update: updateSpy.and.callFake(() => builder),
      eq: eqSpy.and.callFake(() => builder),
      single: singleSpy.and.callFake(() => Promise.resolve(siguienteRespuesta())),
    };
    return builder;
  }

  beforeEach(() => {
    usuarioAuth = { id: 'user-abc' };
    colaRespuestasPerfil = [
      { data: { id_usuario: 'user-abc', nombre: 'Nicole', es_admin: false }, error: null },
    ];
    authStateCallback = undefined;

    getUserSpy = jasmine.createSpy('getUser').and.callFake(() =>
      Promise.resolve({ data: { user: usuarioAuth } })
    );
    selectSpy = jasmine.createSpy('select');
    eqSpy = jasmine.createSpy('eq');
    singleSpy = jasmine.createSpy('single');
    updateSpy = jasmine.createSpy('update');
    fromSpy = jasmine.createSpy('from').and.callFake(() => crearQueryBuilder());
    signUpSpy = jasmine.createSpy('signUp').and.resolveTo({ data: {}, error: null });
    signInWithPasswordSpy = jasmine
      .createSpy('signInWithPassword')
      .and.resolveTo({ data: {}, error: null });
    signOutSpy = jasmine.createSpy('signOut').and.resolveTo({ error: null });
    rpcSpy = jasmine.createSpy('rpc').and.resolveTo({ error: null });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Supabase,
          useValue: {
            client: {
              auth: {
                getUser: getUserSpy,
                onAuthStateChange: (cb: any) => {
                  authStateCallback = cb;
                  return { data: { subscription: { unsubscribe: () => {} } } };
                },
                signUp: signUpSpy,
                signInWithPassword: signInWithPasswordSpy,
                signOut: signOutSpy,
              },
              from: fromSpy,
              rpc: rpcSpy,
            },
          },
        },
      ],
    });

    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-AUTH-01 primera llamada con sesión consulta una vez y devuelve el perfil', async () => {
    const usuario = await service.obtenerUsuarioActual();
    expect(getUserSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(singleSpy).toHaveBeenCalledTimes(1);
    expect(usuario).toEqual(colaRespuestasPerfil[0].data);
  });

  it('UT-AUTH-02 la 2.ª y 3.ª llamada reutilizan la caché, sin nuevas consultas', async () => {
    const primero = await service.obtenerUsuarioActual();
    const segundo = await service.obtenerUsuarioActual();
    const tercero = await service.obtenerUsuarioActual();

    expect(getUserSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(segundo).toEqual(primero);
    expect(tercero).toEqual(primero);
  });

  it('UT-AUTH-03 dos llamadas simultáneas deberían resultar en una sola consulta', async () => {
    const [a, b] = await Promise.all([service.obtenerUsuarioActual(), service.obtenerUsuarioActual()]);
    expect(a).toEqual(b);
    expect(getUserSpy).toHaveBeenCalledTimes(1);
  });

  it('UT-AUTH-04 getUser sin usuario devuelve null sin consultar la tabla usuario', async () => {
    usuarioAuth = null;
    const resultado = await service.obtenerUsuarioActual();
    expect(resultado).toBeNull();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('UT-AUTH-05 un error al leer el perfil no debería quedar en caché', async () => {
    colaRespuestasPerfil = [
      { data: null, error: { message: 'tabla usuario no disponible' } },
      { data: { id_usuario: 'user-abc', nombre: 'Nicole', es_admin: false }, error: null },
    ];

    const primero = await service.obtenerUsuarioActual();
    const segundo = await service.obtenerUsuarioActual();

    expect(primero).toBeNull();
    expect(segundo).not.toBeNull();
    expect(selectSpy).toHaveBeenCalledTimes(2);
  });

  it('UT-AUTH-06 un cambio de sesión (onAuthStateChange) invalida la caché', async () => {
    await service.obtenerUsuarioActual();
    expect(getUserSpy).toHaveBeenCalledTimes(1);

    usuarioAuth = { id: 'user-xyz' };
    colaRespuestasPerfil = [
      { data: { id_usuario: 'user-xyz', nombre: 'Benjamín', es_admin: false }, error: null },
    ];
    authStateCallback?.('SIGNED_IN', null);

    const nuevo = await service.obtenerUsuarioActual();
    expect(getUserSpy).toHaveBeenCalledTimes(2);
    expect(nuevo?.nombre).toBe('Benjamín');
  });

  it('UT-AUTH-07 iniciarSesion con credenciales inválidas lanza y no deja sesión', async () => {
    signInWithPasswordSpy.and.resolveTo({
      data: null,
      error: { message: 'Invalid login credentials' },
    });
    usuarioAuth = null;

    await expectAsync(service.iniciarSesion('a@b.com', 'mal')).toBeRejected();

    const usuario = await service.obtenerUsuarioActual();
    expect(usuario).toBeNull();
  });

  it('UT-AUTH-08 tras cerrarSesion + evento de auth, vuelve a consultar y da null', async () => {
    await service.obtenerUsuarioActual();

    await service.cerrarSesion();
    usuarioAuth = null;
    authStateCallback?.('SIGNED_OUT', null);

    const resultado = await service.obtenerUsuarioActual();
    expect(resultado).toBeNull();
    expect(getUserSpy).toHaveBeenCalledTimes(2);
  });

  it('UT-AUTH-09 actualizarPerfil guarda el nuevo nombre en caché sin volver a consultar', async () => {
    const actualizado = { id_usuario: 'user-abc', nombre: 'Nicole N.', es_admin: false };
    colaRespuestasPerfil = [{ data: actualizado, error: null }];

    const resultado = await service.actualizarPerfil({ nombre: 'Nicole N.' });
    expect(resultado.nombre).toBe('Nicole N.');

    selectSpy.calls.reset();
    getUserSpy.calls.reset();

    const cacheado = await service.obtenerUsuarioActual();
    expect(cacheado?.nombre).toBe('Nicole N.');
    expect(selectSpy).not.toHaveBeenCalled();
    expect(getUserSpy).not.toHaveBeenCalled();
  });

  it('UT-AUTH-10 actualizarPerfil con error no deja la caché con los valores fallidos', async () => {
    await service.obtenerUsuarioActual();
    colaRespuestasPerfil = [{ data: null, error: { message: 'no autorizado', code: '42501' } }];

    await expectAsync(service.actualizarPerfil({ nombre: 'Nombre Hackeado' })).toBeRejected();

    selectSpy.calls.reset();
    getUserSpy.calls.reset();
    const cacheado = await service.obtenerUsuarioActual();
    expect(cacheado?.nombre).not.toBe('Nombre Hackeado');
    expect(cacheado?.nombre).toBe('Nicole');
  });

  it('UT-AUTH-11 eliminarCuenta vacía la caché', async () => {
    await service.obtenerUsuarioActual();

    await service.eliminarCuenta();

    usuarioAuth = null;
    getUserSpy.calls.reset();
    const resultado = await service.obtenerUsuarioActual();
    expect(getUserSpy).toHaveBeenCalledTimes(1);
    expect(resultado).toBeNull();
  });

  it('UT-AUTH-12 registrarse sin aceptar términos lanza y no llama a signUp', async () => {
    await expectAsync(service.registrarse('a@b.com', '123456', 'Nicole', false)).toBeRejected();
    expect(signUpSpy).not.toHaveBeenCalled();
  });
});
