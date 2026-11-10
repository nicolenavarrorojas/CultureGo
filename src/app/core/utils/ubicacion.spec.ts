/// <reference types="jasmine" />

import { mensajeErrorUbicacion, obtenerUbicacionActual, UbicacionError } from './ubicacion';

describe('obtenerUbicacionActual', () => {
  let getCurrentPosition: jasmine.Spy;
  let geolocalizacion: jasmine.Spy;

  // El GPS se simula: ninguna prueba pide el permiso real del navegador.
  beforeEach(() => {
    getCurrentPosition = jasmine.createSpy('getCurrentPosition');
    geolocalizacion = spyOnProperty(Navigator.prototype, 'geolocation', 'get').and.returnValue({
      getCurrentPosition,
    } as unknown as Geolocation);
  });

  it('UT-UBI-01 devuelve latitud, longitud y precisión, pidiendo alta precisión', async () => {
    getCurrentPosition.and.callFake((exito: PositionCallback) =>
      exito({ coords: { latitude: -33.49996, longitude: -70.61663, accuracy: 25 } } as GeolocationPosition)
    );

    const ubicacion = await obtenerUbicacionActual(5000);

    expect(ubicacion).toEqual({ latitud: -33.49996, longitud: -70.61663, precisionMetros: 25 });
    const opciones = getCurrentPosition.calls.argsFor(0)[2] as PositionOptions;
    expect(opciones.enableHighAccuracy).toBeTrue();
    expect(opciones.timeout).toBe(5000);
  });

  it('UT-UBI-02 traduce los códigos de error: permiso denegado, sin señal y tiempo agotado', async () => {
    for (const [codigo, motivo] of [
      [1, 'denegado'],
      [2, 'sin-senal'],
      [3, 'tiempo'],
    ] as const) {
      getCurrentPosition.and.callFake((_exito: PositionCallback, fallo: PositionErrorCallback) =>
        fallo({ code: codigo } as GeolocationPositionError)
      );
      const error = await obtenerUbicacionActual().catch((e) => e);
      expect(error).toEqual(jasmine.any(UbicacionError));
      expect((error as UbicacionError).motivo).toBe(motivo);
    }
  });

  it('UT-UBI-03 sin geolocalización en el navegador se rechaza como no disponible', async () => {
    geolocalizacion.and.returnValue(undefined);
    const error = await obtenerUbicacionActual().catch((e) => e);
    expect((error as UbicacionError).motivo).toBe('no-disponible');
  });

  it('UT-UBI-04 cada motivo tiene un mensaje en español que ofrece otra forma de ubicar el lugar', () => {
    expect(mensajeErrorUbicacion(new UbicacionError('denegado'))).toContain('permiso');
    expect(mensajeErrorUbicacion(new UbicacionError('no-disponible'))).toContain('Escribe la dirección');
    expect(mensajeErrorUbicacion(new UbicacionError('tiempo'))).toContain('a tiempo');
    expect(mensajeErrorUbicacion(new Error('otro'))).toContain('No se pudo obtener tu ubicación');
  });
});
