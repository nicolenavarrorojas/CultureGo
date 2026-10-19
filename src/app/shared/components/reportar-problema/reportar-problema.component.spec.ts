/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { Reportes } from 'src/app/core/services/reportes';
import { Auth } from 'src/app/core/services/auth';
import { ReportarProblemaComponent } from './reportar-problema.component';

describe('ReportarProblemaComponent', () => {
  let component: ReportarProblemaComponent;
  let fixture: ComponentFixture<ReportarProblemaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ReportarProblemaComponent],
      providers: [
        {
          provide: Reportes,
          useValue: { crear: async () => ({}) },
        },
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportarProblemaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opcionesTipo devuelve la misma referencia entre llamadas', () => {
    expect(component.opcionesTipo).toBe(component.opcionesTipo);
  });

  it('opcionesTipo cambia según haya lugar o no', () => {
    const generales = component.opcionesTipo;
    expect(generales.map(o => o.valor)).toEqual(['error_app', 'sugerencia']);

    component.lugar = { id_lugar: 'x', nombre: 'Lugar' } as any;
    expect(component.opcionesTipo.map(o => o.valor)).toEqual(['error_lugar', 'sugerencia']);
    expect(component.opcionesTipo).not.toBe(generales);
  });
});