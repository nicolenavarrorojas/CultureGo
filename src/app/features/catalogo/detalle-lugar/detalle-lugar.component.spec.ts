/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { Lugares } from 'src/app/core/services/lugares';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Auth } from 'src/app/core/services/auth';
import { Reportes } from 'src/app/core/services/reportes';
import { Resenas } from 'src/app/core/services/resenas';
import { Admin } from 'src/app/core/services/admin';
import { DetalleLugarComponent } from './detalle-lugar.component';

describe('DetalleLugarComponent', () => {
  let component: DetalleLugarComponent;
  let fixture: ComponentFixture<DetalleLugarComponent>;

  let usuarioActual: { id_usuario: string; es_admin?: boolean } | null;
  let lugarActual: any;
  let resenasActuales: any[];
  let gamificacionMock: { registrarVisita: jasmine.Spy };
  let lugaresMock: { obtenerPorId: jasmine.Spy };
  let routerMock: { navigate: jasmine.Spy; url: string; events: ReturnType<typeof of> };

  beforeEach(waitForAsync(() => {
    usuarioActual = { id_usuario: 'u1', es_admin: false };
    lugarActual = {
      id_lugar: 'abc-123',
      nombre: 'Museo Nacional de Bellas Artes',
      descripcion: 'Descripción de prueba',
      es_gratuito: true,
      direccion: 'José Miguel de la Barra 650',
      horario: 'Martes a domingo, 10:00 - 18:30',
      telefono: null,
      email_contacto: null,
      url_imagen_principal: null,
      latitud: -33.4489,
      longitud: -70.6693,
      categoria: { nombre: 'Museo' },
      comuna: { nombre: 'Santiago' },
    };
    resenasActuales = [
      {
        id_resena: 'r1',
        id_usuario: 'u2',
        id_lugar: 'abc-123',
        calificacion: 5,
        comentario: 'Excelente lugar',
        fecha_creacion: '2026-09-01T00:00:00Z',
        moderada: false,
        usuario: { nombre: 'Nicole', avatar: { cabeza: 0, ojos: 2, boca: 6, cuerpo: 0 } },
      },
    ];

    gamificacionMock = { registrarVisita: jasmine.createSpy().and.resolveTo(undefined) };
    lugaresMock = { obtenerPorId: jasmine.createSpy().and.callFake(() => Promise.resolve(lugarActual)) };
    routerMock = { navigate: jasmine.createSpy(), url: '/lugares/abc-123', events: of() };

    TestBed.configureTestingModule({
      imports: [DetalleLugarComponent],
      providers: [
        { provide: Lugares, useValue: lugaresMock },
        { provide: Gamificacion, useValue: gamificacionMock },
        { provide: Auth, useValue: { obtenerUsuarioActual: () => Promise.resolve(usuarioActual) } },
        { provide: Reportes, useValue: { crear: async () => ({}) } },
        {
          provide: Resenas,
          useValue: {
            listarPorLugar: () => Promise.resolve(resenasActuales),
            obtenerMiResena: async () => null,
            guardar: async () => ({}),
          },
        },
        { provide: Admin, useValue: { eliminarResena: async () => undefined } },
        { provide: Router, useValue: routerMock },
        {
          provide: AlertController,
          useValue: { create: async () => ({ present: async () => undefined }) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc-123' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleLugarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-CMP-04 carga el lugar usando el id de la ruta', () => {
    expect(lugaresMock.obtenerPorId).toHaveBeenCalledWith('abc-123');
    expect(component.lugar?.id_lugar).toBe('abc-123');
  });

  it('UT-ERR-10 fuera de radio no debería llamar a Gamificacion.registrarVisita', async () => {
    spyOn(component as any, 'obtenerPosicionActual').and.resolveTo({ lat: -33.46, lng: -70.6693 });

    await component.registrarVisita();

    expect(gamificacionMock.registrarVisita).not.toHaveBeenCalled();
    expect(component.toastMensaje).toContain('Acércate');
  });

  it('UT-ERR-11 cooldown: muestra el texto posterior al prefijo COOLDOWN_VISITA', async () => {
    spyOn(component as any, 'obtenerPosicionActual').and.resolveTo({ lat: -33.4489, lng: -70.6693 });
    gamificacionMock.registrarVisita.and.rejectWith({
      message: 'COOLDOWN_VISITA: Ya registraste esta visita hace 2 horas.',
    });

    await component.registrarVisita();

    expect(component.toastMensaje).toBe('Ya registraste esta visita hace 2 horas.');
  });

  it('UT-ERR-12 sin usuario muestra aviso y redirige a login con redirectTo', async () => {
    usuarioActual = null;
    jasmine.clock().install();
    try {
      await component.registrarVisita();
      expect(component.toastMensaje).toBe('Inicia sesión para registrar tu visita');
      expect(routerMock.navigate).not.toHaveBeenCalled();

      jasmine.clock().tick(2500);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { redirectTo: routerMock.url },
      });
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('UT-ERR-13 permiso de ubicación denegado muestra aviso de activar ubicación', async () => {
    spyOn(component as any, 'obtenerPosicionActual').and.rejectWith(new Error('denegado'));

    await component.registrarVisita();

    expect(component.toastMensaje).toBe('Activa la ubicación para poder registrar tu visita.');
  });

  it('UT-ERR-14 lugar sin coordenadas muestra el mensaje correspondiente', async () => {
    lugarActual = { ...lugarActual, latitud: null, longitud: null };
    await component.ngOnInit();

    await component.registrarVisita();

    expect(component.toastMensaje).toContain('no tiene coordenadas cargadas');
  });

  it('UT-ERR-15 error de red al registrar muestra el mensaje genérico', async () => {
    spyOn(component as any, 'obtenerPosicionActual').and.resolveTo({ lat: -33.4489, lng: -70.6693 });
    gamificacionMock.registrarVisita.and.rejectWith({ message: 'Failed to fetch' });

    await component.registrarVisita();

    expect(component.toastMensaje).toBe('No se pudo registrar la visita. Intenta de nuevo.');
  });

  it('UT-ERR-16 un error con forma desconocida, null o undefined no debería lanzar', async () => {
    spyOn(component as any, 'obtenerPosicionActual').and.resolveTo({ lat: -33.4489, lng: -70.6693 });

    for (const error of [null, undefined, 'texto plano', 42]) {
      gamificacionMock.registrarVisita.and.rejectWith(error);
      await expectAsync(component.registrarVisita()).toBeResolved();
      expect(component.toastMensaje).toBe('No se pudo registrar la visita. Intenta de nuevo.');
    }
  });
});
