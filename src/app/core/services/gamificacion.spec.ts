import { TestBed } from '@angular/core/testing';

import { Gamificacion } from './gamificacion';
import { Supabase } from './supabase';

describe('Gamificacion', () => {
  let service: Gamificacion;
  let respuesta: { data: any; error: any };
  let insertSpy: jasmine.Spy;
  let fromSpy: jasmine.Spy;

  function crearBuilder(): any {
    const builder: any = {};
    ['select', 'eq', 'order'].forEach((metodo) => {
      builder[metodo] = jasmine.createSpy(metodo).and.callFake(() => builder);
    });
    builder.insert = insertSpy.and.callFake(() => builder);
    builder.single = jasmine.createSpy('single').and.callFake(() => Promise.resolve(respuesta));
    builder.then = (resolve: any, reject: any) => Promise.resolve(respuesta).then(resolve, reject);
    return builder;
  }

  beforeEach(() => {
    respuesta = { data: [], error: null };
    insertSpy = jasmine.createSpy('insert');
    fromSpy = jasmine.createSpy('from').and.callFake(() => crearBuilder());

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: { client: { from: fromSpy } } }],
    });
    service = TestBed.inject(Gamificacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-GAM-01 contarLugaresVisitados cuenta lugares distintos', async () => {
    respuesta = { data: [{ id_lugar: 'a' }, { id_lugar: 'b' }, { id_lugar: 'c' }], error: null };
    expect(await service.contarLugaresVisitados('u1')).toBe(3);
  });

  it('UT-GAM-02 listarLugaresVisitados no duplica y conserva la más reciente', async () => {
    const lugarA = { id_lugar: 'a', nombre: 'Lugar A' };
    const lugarB = { id_lugar: 'b', nombre: 'Lugar B' };
    respuesta = {
      data: [
        { fecha_visita: '2026-01-03', lugar: lugarA },
        { fecha_visita: '2026-01-02', lugar: lugarA },
        { fecha_visita: '2026-01-01', lugar: lugarA },
        { fecha_visita: '2026-01-05', lugar: lugarB },
      ],
      error: null,
    };
    const resultado = await service.listarLugaresVisitados('u1');
    expect(resultado.length).toBe(2);
    expect(resultado[0].lugar.id_lugar).toBe('a');
    expect(resultado[0].fecha_visita).toBe('2026-01-03');
  });

  it('UT-GAM-03 contarCategoriasVisitadas cuenta categorías distintas', async () => {
    respuesta = {
      data: [
        { lugar: { id_categoria: 'cat-museo' } },
        { lugar: { id_categoria: 'cat-museo' } },
        { lugar: { id_categoria: 'cat-museo' } },
      ],
      error: null,
    };
    expect(await service.contarCategoriasVisitadas('u1')).toBe(1);
  });

  it('UT-GAM-04 contarVisitasPorCategoria cuenta lugares distintos por categoría', async () => {
    respuesta = {
      data: [
        { id_lugar: 'a', lugar: { id_categoria: 'cat-1' } },
        { id_lugar: 'a', lugar: { id_categoria: 'cat-1' } },
        { id_lugar: 'b', lugar: { id_categoria: 'cat-1' } },
        { id_lugar: 'c', lugar: { id_categoria: 'cat-2' } },
        { id_lugar: 'd', lugar: { id_categoria: 'cat-2' } },
      ],
      error: null,
    };
    const conteo = await service.contarVisitasPorCategoria('u1');
    expect(conteo['cat-1']).toBe(2);
    expect(conteo['cat-2']).toBe(2);
  });

  it('UT-GAM-05 data vacía da contadores en 0 y listas vacías', async () => {
    respuesta = { data: [], error: null };
    expect(await service.contarLugaresVisitados('u1')).toBe(0);
    expect(await service.contarCategoriasVisitadas('u1')).toBe(0);
    expect(await service.listarLugaresVisitados('u1')).toEqual([]);
    expect(await service.contarVisitasPorCategoria('u1')).toEqual({});
    expect(await service.contarVisitasTotales('u1')).toBe(0);
  });

  it('UT-GAM-06 data null se trata como vacío, sin TypeError', async () => {
    respuesta = { data: null, error: null };
    await expectAsync(service.contarLugaresVisitados('u1')).toBeResolvedTo(0);
    await expectAsync(service.listarLugaresVisitados('u1')).toBeResolvedTo([]);
    await expectAsync(service.contarVisitasPorCategoria('u1')).toBeResolvedTo({});
  });

  it('UT-GAM-07 lugar con id_categoria null cuenta como lugar pero no agrega categoría', async () => {
    respuesta = {
      data: [
        { id_lugar: 'a', lugar: { id_categoria: null } },
        { id_lugar: 'b', lugar: { id_categoria: 'cat-1' } },
      ],
      error: null,
    };
    const conteo = await service.contarVisitasPorCategoria('u1');
    expect(Object.keys(conteo)).toEqual(['cat-1']);
    expect(await service.contarLugaresVisitados('u1')).toBe(2);
  });

  it('UT-GAM-08 un error en la consulta debería rechazar con ese error', async () => {
    respuesta = { data: null, error: { message: 'tabla visita no disponible' } };
    await expectAsync(service.contarLugaresVisitados('u1')).toBeRejectedWith(
      jasmine.objectContaining({ message: 'tabla visita no disponible' })
    );
  });

  it('UT-GAM-09 registrarVisita inserta id_usuario/id_lugar y devuelve la fila', async () => {
    respuesta = { data: { id_visita: 'v1', id_usuario: 'u1', id_lugar: 'l1' }, error: null };
    const resultado = await service.registrarVisita('u1', 'l1');
    expect(insertSpy).toHaveBeenCalledWith({ id_usuario: 'u1', id_lugar: 'l1' });
    expect(resultado).toEqual(respuesta.data);
  });

  it('UT-GAM-10 el insert con cooldown se propaga intacto', async () => {
    respuesta = { data: null, error: { message: 'COOLDOWN_VISITA: Ya registraste esta visita.' } };
    await expectAsync(service.registrarVisita('u1', 'l1')).toBeRejectedWith(
      jasmine.objectContaining({ message: 'COOLDOWN_VISITA: Ya registraste esta visita.' })
    );
  });
});
