/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { Auth } from 'src/app/core/services/auth';
import { Reportes } from 'src/app/core/services/reportes';
import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { MisTicketsComponent } from './mis-tickets.component';

describe('MisTicketsComponent', () => {
  let component: MisTicketsComponent;
  let fixture: ComponentFixture<MisTicketsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MisTicketsComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123' }),
          },
        },
        {
          provide: Reportes,
          useValue: { listarMisReportes: async () => [] },
        },
        {
          provide: SugerenciasLugar,
          useValue: { listarMisSugerencias: async () => [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MisTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});