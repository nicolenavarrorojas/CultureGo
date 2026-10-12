/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { Reportes } from 'src/app/core/services/reportes';
import { Auth } from 'src/app/core/services/auth';
import { ReportarProblemaComponent } from './reportar-problema.component';

describe('ReportarProblemaComponent', () => {
  let component: ReportarProblemaComponent;
  let fixture: ComponentFixture<ReportarProblemaComponent>;
  let reportesMock: { crear: jasmine.Spy };

  beforeEach(waitForAsync(() => {
    reportesMock = { crear: jasmine.createSpy().and.resolveTo({}) };

    TestBed.configureTestingModule({
      imports: [ReportarProblemaComponent],
      providers: [
        { provide: Reportes, useValue: reportesMock },
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

  it('UT-CMP-01 con descripción vacía o corta, el formulario es inválido y no llama al servicio', async () => {
    component.tipo = 'error_app';
    component.descripcion = 'muy corta';
    expect(component.formularioValido).toBeFalse();

    await component.enviar();

    expect(reportesMock.crear).not.toHaveBeenCalled();
  });
});