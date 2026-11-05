import { TestBed } from '@angular/core/testing';

import { CalificacionesApp } from './calificaciones-app';
import { Supabase } from './supabase';

describe('CalificacionesApp', () => {
  let service: CalificacionesApp;
  let respuesta: { data: any; error: any };
  let fromSpy: jasmine.Spy;
  let builder: any;

  beforeEach(() => {
    respuesta = { data: { id_usuario: 'u1', calificacion: 4, comentario: null }, error: null };
    fromSpy = jasmine.createSpy('from').and.callFake(() => {
      builder = {
        select: jasmine.createSpy('select').and.callFake(() => builder),
        eq: jasmine.createSpy('eq').and.callFake(() => builder),
        upsert: jasmine.createSpy('upsert').and.callFake(() => builder),
        maybeSingle: jasmine.createSpy('maybeSingle').and.callFake(() => Promise.resolve(respuesta)),
        single: jasmine.createSpy('single').and.callFake(() => Promise.resolve(respuesta)),
      };
      return builder;
    });

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: { client: { from: fromSpy } } }],
    });
    service = TestBed.inject(CalificacionesApp);
  });

  it('UT-CAL-06 obtenerMia consulta solo la calificación del usuario, en su propia tabla', async () => {
    const resultado = await service.obtenerMia('u1');

    expect(fromSpy).toHaveBeenCalledWith('calificacion_app');
    expect(builder.eq).toHaveBeenCalledWith('id_usuario', 'u1');
    expect(resultado).toEqual(respuesta.data);
  });

  it('UT-CAL-07 guardar hace upsert por usuario (una calificación por persona) y propaga errores', async () => {
    await service.guardar({ id_usuario: 'u1', calificacion: 5, comentario: 'Muy útil' });

    expect(fromSpy).toHaveBeenCalledWith('calificacion_app');
    const [datos, opciones] = builder.upsert.calls.mostRecent().args;
    expect(datos).toEqual(jasmine.objectContaining({ id_usuario: 'u1', calificacion: 5, comentario: 'Muy útil' }));
    expect(datos.fecha_actualizacion).toEqual(jasmine.any(String));
    expect(opciones).toEqual({ onConflict: 'id_usuario' });

    respuesta = { data: null, error: { message: 'sin permiso' } };
    await expectAsync(service.guardar({ id_usuario: 'u1', calificacion: 3 })).toBeRejectedWith(
      jasmine.objectContaining({ message: 'sin permiso' })
    );
  });
});
