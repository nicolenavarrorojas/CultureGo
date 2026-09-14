/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DetalleLugarComponent],
      providers: [
        {
          provide: Lugares,
          useValue: {
            obtenerPorId: async () => ({
              id_lugar: 'abc-123',
              nombre: 'Museo Nacional de Bellas Artes',
              descripcion: 'Descripción de prueba',
              es_gratuito: true,
              direccion: 'José Miguel de la Barra 650',
              horario: 'Martes a domingo, 10:00 - 18:30',
              telefono: null,
              email_contacto: null,
              url_imagen_principal: null,
              categoria: { nombre: 'Museo' },
              comuna: { nombre: 'Santiago' },
            }),
          },
        },
        {
          provide: Gamificacion,
          useValue: { registrarVisita: async () => undefined },
        },
        {
          provide: Auth,
          useValue: { obtenerUsuarioActual: async () => null },
        },
        {
          provide: Reportes,
          useValue: { crear: async () => ({}) },
        },
        {
          provide: Resenas,
          useValue: {
            listarPorLugar: async () => [],
            obtenerMiResena: async () => null,
            guardar: async () => ({}),
          },
        },
        {
          provide: Admin,
          useValue: { eliminarResena: async () => undefined },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'abc-123' }) },
          },
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
});