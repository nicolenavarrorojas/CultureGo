/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';

import { Admin } from 'src/app/core/services/admin';
import { Lugares } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { Auth } from 'src/app/core/services/auth';
import { GestionLugaresComponent } from './gestion-lugares.component';

describe('GestionLugaresComponent', () => {
  let component: GestionLugaresComponent;
  let fixture: ComponentFixture<GestionLugaresComponent>;
  let adminMock: {
    crearLugar: jasmine.Spy;
    editarLugar: jasmine.Spy;
    eliminarLugar: () => Promise<undefined>;
    listarReportes: () => Promise<any[]>;
    actualizarEstadoReporte: () => Promise<undefined>;
    listarSugerenciasLugar: () => Promise<any[]>;
    marcarSugerenciaRevisada: () => Promise<undefined>;
    subirImagenLugar: () => Promise<string>;
    eliminarImagenLugar: () => Promise<undefined>;
  };

  beforeEach(waitForAsync(() => {
    adminMock = {
      crearLugar: jasmine.createSpy().and.resolveTo({}),
      editarLugar: jasmine.createSpy().and.resolveTo({}),
      eliminarLugar: async () => undefined,
      listarReportes: async () => [],
      actualizarEstadoReporte: async () => undefined,
      listarSugerenciasLugar: async () => [],
      marcarSugerenciaRevisada: async () => undefined,
      subirImagenLugar: async () => 'https://ejemplo.com/imagen.jpg',
      eliminarImagenLugar: async () => undefined,
    };

    TestBed.configureTestingModule({
      imports: [GestionLugaresComponent],
      providers: [
        { provide: Admin, useValue: adminMock },
        {
          provide: Lugares,
          useValue: { listar: async () => [] },
        },
        {
          provide: Categorias,
          useValue: { listar: async () => [] },
        },
        {
          provide: Comunas,
          useValue: { listar: async () => [] },
        },
        {
          provide: Auth,
          useValue: {
            cerrarSesion: async () => undefined,
            obtenerUsuarioActual: async () => ({ id_usuario: 'admin-abc' }),
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
        },
        {
          provide: AlertController,
          useValue: { create: async () => ({ present: async () => undefined }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionLugaresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-CMP-03 datos incompletos no debería llamar a crear/editar', async () => {
    component.formulario = { ...component.formulario, nombre: '', id_categoria: null, id_comuna: null };
    expect(component.formularioValido).toBeFalse();

    await component.guardarLugar();

    expect(adminMock.crearLugar).not.toHaveBeenCalled();
    expect(adminMock.editarLugar).not.toHaveBeenCalled();
  });

  it('UT-CMP-03b coordenadas fuera de rango: por plan no debería llamar a crear (sin validación de rango en el código)', async () => {
    component.formulario = {
      ...component.formulario,
      nombre: 'Lugar con coordenadas inválidas',
      id_categoria: 'cat-1',
      id_comuna: 'com-1',
      latitud: 999,
      longitud: -999,
    };

    await component.guardarLugar();

    expect(adminMock.crearLugar).not.toHaveBeenCalled();
  });
});