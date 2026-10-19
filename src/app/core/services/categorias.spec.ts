import { TestBed } from '@angular/core/testing';

import { Categorias } from './categorias';
import { Supabase } from './supabase';

describe('Categorias', () => {
  let service: Categorias;
  let respuesta: { data: any; error: any };
  let fromSpy: jasmine.Spy;

  beforeEach(() => {
    respuesta = { data: [{ id_categoria: 'c1', nombre: 'Museo' }], error: null };
    fromSpy = jasmine.createSpy('from').and.callFake(() => {
      const builder: any = {
        select: jasmine.createSpy('select').and.callFake(() => builder),
        order: jasmine.createSpy('order').and.callFake(() => builder),
        then: (resolve: any, reject: any) => Promise.resolve(respuesta).then(resolve, reject),
      };
      return builder;
    });

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: { client: { from: fromSpy } } }],
    });
    service = TestBed.inject(Categorias);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-CAT-01 listar devuelve las categorías', async () => {
    const resultado = await service.listar();
    expect(resultado).toEqual(respuesta.data);
  });

  it('UT-CAT-02 listar propaga el error de la consulta', async () => {
    respuesta = { data: null, error: { message: 'tabla categoria no disponible' } };
    await expectAsync(service.listar()).toBeRejectedWith(
      jasmine.objectContaining({ message: 'tabla categoria no disponible' })
    );
  });
});
