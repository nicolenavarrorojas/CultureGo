/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';

import { Geocodificacion, GeocodificacionError, mensajeErrorGeocodificacion } from './geocodificacion';

// Respuestas de Nominatim simuladas: ninguna prueba llama al servicio real.
const RESPUESTA_BUSQUEDA = [
  {
    display_name: 'Museo Nacional de Bellas Artes, 650, José Miguel de la Barra, Santiago, Provincia de Santiago, Región Metropolitana de Santiago, 8320000, Chile',
    lat: '-33.4353',
    lon: '-70.6436',
  },
  { display_name: 'Palacio Museo de Bellas Artes, Mosqueto, Santiago, Chile', lat: '-33.4357', lon: '-70.6440' },
];

function respuesta(cuerpo: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status }));
}

describe('Geocodificacion', () => {
  let servicio: Geocodificacion;
  let fetchSpy: jasmine.Spy;
  let esperas: number[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(Geocodificacion);
    fetchSpy = spyOn(window, 'fetch').and.callFake(() => respuesta(RESPUESTA_BUSQUEDA));

    // Las esperas entre solicitudes se registran y se resuelven al instante;
    // el temporizador de 8 s que corta la solicitud no se dispara.
    esperas = [];
    spyOn(window, 'setTimeout').and.callFake(((fn: () => void, ms?: number) => {
      if (ms === 8000) return 0;
      esperas.push(ms ?? 0);
      fn();
      return 0;
    }) as unknown as typeof setTimeout);
  });

  function urlLlamada(indice = 0): URL {
    return new URL(fetchSpy.calls.argsFor(indice)[0] as string);
  }

  it('UT-GEO-01 buscar devuelve hasta 5 resultados de Santiago con la dirección acortada', async () => {
    const resultados = await servicio.buscar('  Museo de Bellas Artes ');

    expect(resultados).toEqual([
      { etiqueta: 'Museo Nacional de Bellas Artes, 650, José Miguel de la Barra, Santiago', latitud: -33.4353, longitud: -70.6436 },
      { etiqueta: 'Palacio Museo de Bellas Artes, Mosqueto, Santiago', latitud: -33.4357, longitud: -70.644 },
    ]);
    const url = urlLlamada();
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe('Museo de Bellas Artes');
    expect(url.searchParams.get('countrycodes')).toBe('cl');
    expect(url.searchParams.get('bounded')).toBe('1');
    expect(url.searchParams.get('viewbox')).toBeTruthy();
    expect(url.searchParams.get('limit')).toBe('5');
  });

  it('UT-GEO-02 un texto vacío o solo con espacios no consulta el servicio', async () => {
    expect(await servicio.buscar('   ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('UT-GEO-03 descarta los resultados con coordenadas inválidas', async () => {
    fetchSpy.and.callFake(() => respuesta([{ display_name: 'Sin coordenadas', lat: 'x', lon: '' }, RESPUESTA_BUSQUEDA[1]]));
    const resultados = await servicio.buscar('Bellas Artes');
    expect(resultados.length).toBe(1);
    expect(resultados[0].etiqueta).toBe('Palacio Museo de Bellas Artes, Mosqueto, Santiago');
  });

  it('UT-GEO-04 dos solicitudes seguidas esperan al menos 1 segundo entre sí', async () => {
    await servicio.buscar('Plaza de Armas');
    expect(esperas).toEqual([]);

    await servicio.buscar('Plaza de Armas');
    expect(esperas.length).toBe(1);
    expect(esperas[0]).toBeGreaterThan(900);
    expect(esperas[0]).toBeLessThanOrEqual(1000);
  });

  it('UT-GEO-05 un 429 se informa como límite y otro error HTTP como falla del servicio', async () => {
    fetchSpy.and.callFake(() => respuesta({}, 429));
    await expectAsync(servicio.buscar('a')).toBeRejectedWith(new GeocodificacionError('limite'));

    fetchSpy.and.callFake(() => respuesta({}, 500));
    await expectAsync(servicio.buscar('a')).toBeRejectedWith(new GeocodificacionError('servicio'));
  });

  it('UT-GEO-06 sin conexión se informa como sin-conexion', async () => {
    fetchSpy.and.callFake(() => Promise.reject(new TypeError('Failed to fetch')));
    const error = await servicio.buscar('a').catch((e) => e);
    expect(error).toEqual(jasmine.any(GeocodificacionError));
    expect((error as GeocodificacionError).motivo).toBe('sin-conexion');
  });

  it('UT-GEO-07 si el servicio no responde a tiempo se corta y se informa como tiempo', async () => {
    // El temporizador de 8 s se dispara de inmediato: la solicitud se aborta.
    (window.setTimeout as unknown as jasmine.Spy).and.callFake(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout);
    fetchSpy.and.callFake((_url: string, opciones: RequestInit) =>
      opciones.signal!.aborted ? Promise.reject(new DOMException('aborted', 'AbortError')) : respuesta([])
    );
    const error = await servicio.buscar('a').catch((e) => e);
    expect((error as GeocodificacionError).motivo).toBe('tiempo');
  });

  it('UT-GEO-08 direccionDe devuelve la dirección acortada, o null si no hay ninguna', async () => {
    fetchSpy.and.callFake(() =>
      respuesta({ display_name: 'Monumento, Plaza de Armas, Santiago, Provincia de Santiago, 8320000, Chile', lat: '-33.4', lon: '-70.6' })
    );
    expect(await servicio.direccionDe(-33.4378, -70.6505)).toBe('Monumento, Plaza de Armas, Santiago');
    expect(urlLlamada().pathname).toBe('/reverse');

    fetchSpy.and.callFake(() => respuesta({ error: 'Unable to geocode' }));
    expect(await servicio.direccionDe(0, 0)).toBeNull();
  });

  it('UT-GEO-09 cada motivo de error tiene un mensaje en español para el usuario', () => {
    expect(mensajeErrorGeocodificacion(new GeocodificacionError('sin-conexion'))).toContain('conexión');
    expect(mensajeErrorGeocodificacion(new GeocodificacionError('limite'))).toContain('ocupado');
    expect(mensajeErrorGeocodificacion(new GeocodificacionError('tiempo'))).toContain('tardó');
    expect(mensajeErrorGeocodificacion(new Error('otro'))).toContain('No se pudo buscar');
  });
});
