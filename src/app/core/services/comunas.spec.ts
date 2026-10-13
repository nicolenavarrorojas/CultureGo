import { TestBed } from '@angular/core/testing';

import { Comunas } from './comunas';
import { Supabase } from './supabase';

describe('Comunas', () => {
  let service: Comunas;
  let respuesta: { data: any; error: any };
  let fromSpy: jasmine.Spy;

  beforeEach(() => {
    respuesta = { data: [{ id_comuna: 'm1', nombre: 'Santiago' }], error: null };
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
    service = TestBed.inject(Comunas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-CAT-01b listar devuelve las comunas', async () => {
    const resultado = await service.listar();
    expect(resultado).toEqual(respuesta.data);
  });

  it('UT-CAT-02b listar propaga el error de la consulta', async () => {
    respuesta = { data: null, error: { message: 'tabla comuna no disponible' } };
    await expectAsync(service.listar()).toBeRejectedWith(
      jasmine.objectContaining({ message: 'tabla comuna no disponible' })
    );
  });
});
