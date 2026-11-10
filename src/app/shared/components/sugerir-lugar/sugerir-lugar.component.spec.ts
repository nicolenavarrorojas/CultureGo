/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';

import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Categorias } from 'src/app/core/services/categorias';
import { Auth } from 'src/app/core/services/auth';
import { Geocodificacion, GeocodificacionError, ResultadoDireccion } from 'src/app/core/services/geocodificacion';
import { SugerirLugarComponent } from './sugerir-lugar.component';

const MUSEO: ResultadoDireccion = { etiqueta: 'Museo Nacional de Bellas Artes, Santiago', latitud: -33.4353, longitud: -70.6436 };
const PALACIO: ResultadoDireccion = { etiqueta: 'Palacio Museo de Bellas Artes, Santiago', latitud: -33.4357, longitud: -70.644 };

describe('SugerirLugarComponent', () => {
  let component: SugerirLugarComponent;
  let fixture: ComponentFixture<SugerirLugarComponent>;
  let sugerenciasMock: { crear: jasmine.Spy };
  let geocodificacionMock: { buscar: jasmine.Spy; direccionDe: jasmine.Spy };
  let alertaMock: { create: jasmine.Spy; rolAlCerrar: string };

  beforeEach(waitForAsync(() => {
    sugerenciasMock = { crear: jasmine.createSpy().and.resolveTo({}) };
    geocodificacionMock = {
      buscar: jasmine.createSpy('buscar').and.resolveTo([]),
      direccionDe: jasmine.createSpy('direccionDe').and.resolveTo(null),
    };
    alertaMock = {
      rolAlCerrar: 'confirm',
      create: jasmine.createSpy('create').and.callFake(async () => ({
        present: async () => undefined,
        onDidDismiss: async () => ({ role: alertaMock.rolAlCerrar }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [SugerirLugarComponent],
      providers: [
        { provide: SugerenciasLugar, useValue: sugerenciasMock },
        { provide: Categorias, useValue: { listar: async () => [] } },
        {
          provide: Auth,
          useValue: { obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123' }) },
        },
        { provide: Geocodificacion, useValue: geocodificacionMock },
        { provide: AlertController, useValue: alertaMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SugerirLugarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  /** Simula el permiso de ubicación y el GPS del dispositivo. */
  function simularUbicacion(permiso: PermissionState, coordenadas = { latitude: -33.49996, longitude: -70.61663, accuracy: 20 }) {
    spyOnProperty(Navigator.prototype, 'permissions', 'get').and.returnValue({
      query: async () => ({ state: permiso }),
    } as unknown as Permissions);
    const getCurrentPosition = jasmine
      .createSpy('getCurrentPosition')
      .and.callFake((exito: PositionCallback) => exito({ coords: coordenadas } as GeolocationPosition));
    spyOnProperty(Navigator.prototype, 'geolocation', 'get').and.returnValue({ getCurrentPosition } as unknown as Geolocation);
    return getCurrentPosition;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-CMP-02 sin nombre, categoría o coordenadas seleccionadas, el formulario es inválido', async () => {
    component.nombre = '';
    component.idCategoria = null;
    component.latitudSeleccionada = null;
    component.longitudSeleccionada = null;
    expect(component.formularioValido).toBeFalse();

    component.nombre = 'Plaza de prueba';
    expect(component.formularioValido).toBeFalse();

    component.idCategoria = 'cat-1';
    expect(component.formularioValido).toBeFalse();

    component.latitudSeleccionada = -33.45;
    component.longitudSeleccionada = -70.65;
    expect(component.formularioValido).toBeTrue();

    component.nombre = '';
    await component.enviar();
    expect(sugerenciasMock.crear).not.toHaveBeenCalled();
  });

  it('UT-SUG-01 buscar sin escribir una dirección avisa y no consulta el servicio', async () => {
    component.direccion = '   ';
    await component.buscarDireccion();
    expect(geocodificacionMock.buscar).not.toHaveBeenCalled();
    expect(component.mensajeUbicacionEsError).toBeTrue();
    expect(component.mensajeUbicacion).toContain('Escribe una dirección');
  });

  it('UT-SUG-02 con un solo resultado marca el punto directamente, sin abrir el menú', async () => {
    geocodificacionMock.buscar.and.resolveTo([MUSEO]);
    component.direccion = 'Museo Nacional de Bellas Artes';
    await component.buscarDireccion();

    expect(component.resultadosDireccion).toEqual([]);
    expect(component.direccion).toBe(MUSEO.etiqueta);
    expect(component.latitudSeleccionada).toBe(MUSEO.latitud);
    expect(component.longitudSeleccionada).toBe(MUSEO.longitud);
  });

  it('UT-SUG-03 con varios resultados abre el menú; al elegir uno marca el punto y lo cierra', async () => {
    geocodificacionMock.buscar.and.resolveTo([MUSEO, PALACIO]);
    component.direccion = 'Bellas Artes';
    await component.buscarDireccion();

    // El menú vive dentro del modal (no abierto en la prueba): se verifica el estado del componente.
    expect(component.resultadosDireccion).toEqual([MUSEO, PALACIO]);

    component.elegirResultado(PALACIO);
    expect(component.resultadosDireccion).toEqual([]);
    expect(component.direccion).toBe(PALACIO.etiqueta);
    expect(component.latitudSeleccionada).toBe(PALACIO.latitud);
    expect(component.mensajeUbicacion).toBe('');
  });

  it('UT-SUG-04 sin resultados o con error del servicio muestra un mensaje de error', async () => {
    component.direccion = 'Plaza Sotomayor, Valparaíso';
    await component.buscarDireccion();
    expect(component.mensajeUbicacionEsError).toBeTrue();
    expect(component.mensajeUbicacion).toContain('No encontramos esa dirección en Santiago');

    geocodificacionMock.buscar.and.rejectWith(new GeocodificacionError('sin-conexion'));
    await component.buscarDireccion();
    expect(component.mensajeUbicacion).toContain('No hay conexión');
    expect(component.buscandoDireccion).toBeFalse();
  });

  it('UT-SUG-05 Escape con el menú abierto lo cierra sin cerrar el formulario; sin menú no interviene', () => {
    component.resultadosDireccion = [MUSEO, PALACIO];
    const conMenu = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(conMenu, 'stopPropagation');
    component.alPresionarEscape(conMenu);
    expect(conMenu.stopPropagation).toHaveBeenCalled();
    expect(component.resultadosDireccion).toEqual([]);

    const sinMenu = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(sinMenu, 'stopPropagation');
    component.alPresionarEscape(sinMenu);
    expect(sinMenu.stopPropagation).not.toHaveBeenCalled();
  });

  it('UT-SUG-06 tocar fuera del buscador cierra el menú; tocar dentro no', () => {
    const dentro = document.createElement('div');
    dentro.className = 'campo-ubicacion';
    const hijo = document.createElement('button');
    dentro.appendChild(hijo);

    component.resultadosDireccion = [MUSEO, PALACIO];
    component.alTocarContenido({ target: hijo } as unknown as Event);
    expect(component.resultadosDireccion.length).toBe(2);

    component.alTocarContenido({ target: document.createElement('p') } as unknown as Event);
    expect(component.resultadosDireccion).toEqual([]);
  });

  it('UT-SUG-07 con el permiso denegado explica cómo activarlo y no pide la ubicación', async () => {
    const getCurrentPosition = simularUbicacion('denied');
    await component.usarUbicacionActual();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(alertaMock.create).not.toHaveBeenCalled();
    expect(component.mensajeUbicacionEsError).toBeTrue();
    expect(component.mensajeUbicacion).toContain('No diste permiso de ubicación');
  });

  it('UT-SUG-08 antes del primer permiso explica el uso de la ubicación; si cancela, no la pide', async () => {
    const getCurrentPosition = simularUbicacion('prompt');
    alertaMock.rolAlCerrar = 'cancel';
    await component.usarUbicacionActual();
    expect(alertaMock.create).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('UT-SUG-09 al continuar marca la ubicación actual y completa la dirección, sin avisos', async () => {
    simularUbicacion('prompt', { latitude: -33.49996, longitude: -70.61663, accuracy: 350 });
    geocodificacionMock.direccionDe.and.resolveTo('DUOC UC San Joaquín, 4917, Avenida Vicuña Mackenna');

    await component.usarUbicacionActual();

    expect(alertaMock.create).toHaveBeenCalledTimes(1);
    expect(component.latitudSeleccionada).toBe(-33.49996);
    expect(component.longitudSeleccionada).toBe(-70.61663);
    expect(component.direccion).toBe('DUOC UC San Joaquín, 4917, Avenida Vicuña Mackenna');
    // Decisión del equipo: no se avisa la precisión de la ubicación.
    expect(component.mensajeUbicacion).toBe('');
  });

  it('UT-SUG-10 la sugerencia se envía con la dirección, o con null si quedó vacía', async () => {
    component.nombre = ' Feria de prueba ';
    component.idCategoria = 'cat-1';
    component.latitudSeleccionada = -33.4353;
    component.longitudSeleccionada = -70.6436;
    component.direccion = ' Museo Nacional de Bellas Artes, Santiago ';
    await component.enviar();
    expect(sugerenciasMock.crear).toHaveBeenCalledWith(
      jasmine.objectContaining({ nombre: 'Feria de prueba', direccion: 'Museo Nacional de Bellas Artes, Santiago' })
    );

    component.nombre = 'Otra feria';
    component.idCategoria = 'cat-1';
    component.latitudSeleccionada = -33.4353;
    component.longitudSeleccionada = -70.6436;
    component.direccion = '';
    await component.enviar();
    expect(sugerenciasMock.crear.calls.mostRecent().args[0].direccion).toBeNull();
  });
});
