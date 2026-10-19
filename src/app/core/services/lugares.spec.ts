import { TestBed } from '@angular/core/testing';

import { Lugares } from './lugares';
import { Supabase } from './supabase';

describe('Lugares', () => {
  let service: Lugares;
  let respuesta: { data: any; error: any };
  let eqSpy: jasmine.Spy;
  let ilikeSpy: jasmine.Spy;
  let fromSpy: jasmine.Spy;

  function crearBuilder(): any {
    const builder: any = {
      select: jasmine.createSpy('select').and.callFake(() => builder),
      eq: eqSpy.and.callFake(() => builder),
      ilike: ilikeSpy.and.callFake(() => builder),
      single: jasmine.createSpy('single').and.callFake(() => Promise.resolve(respuesta)),
      then: (resolve: any, reject: any) => Promise.resolve(respuesta).then(resolve, reject),
    };
    return builder;
  }

  beforeEach(() => {
    respuesta = { data: [], error: null };
    eqSpy = jasmine.createSpy('eq');
    ilikeSpy = jasmine.createSpy('ilike');
    fromSpy = jasmine.createSpy('from').and.callFake(() => crearBuilder());

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: { client: { from: fromSpy } } }],
    });
    service = TestBed.inject(Lugares);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-LUG-01 listar sin filtros no aplica eq ni ilike', async () => {
    await service.listar();
    expect(eqSpy).not.toHaveBeenCalled();
    expect(ilikeSpy).not.toHaveBeenCalled();
  });

  it('UT-LUG-02 listar con categoría/comuna/gratuidad aplica un eq por filtro', async () => {
    await service.listar({ id_categoria: 'cat-1', id_comuna: 'com-1', soloGratuitos: true });
    expect(eqSpy).toHaveBeenCalledTimes(3);
    expect(eqSpy).toHaveBeenCalledWith('id_categoria', 'cat-1');
    expect(eqSpy).toHaveBeenCalledWith('id_comuna', 'com-1');
    expect(eqSpy).toHaveBeenCalledWith('es_gratuito', true);
  });

  it('UT-LUG-03 texto vacío o solo espacios no debería llamar ilike', async () => {
    await service.listar({ texto: '' });
    expect(ilikeSpy).not.toHaveBeenCalled();

    ilikeSpy.calls.reset();
    await service.listar({ texto: '   ' });
    expect(ilikeSpy).not.toHaveBeenCalled();
  });

  it('UT-LUG-04 obtenerPorId con id inexistente propaga el error controlado', async () => {
    respuesta = { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
    await expectAsync(service.obtenerPorId('no-existe')).toBeRejectedWith(
      jasmine.objectContaining({ code: 'PGRST116' })
    );
  });
});
