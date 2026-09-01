/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Categorias } from 'src/app/core/services/categorias';
import { MedallasComponent } from './medallas.component';

describe('MedallasComponent', () => {
  let component: MedallasComponent;
  let fixture: ComponentFixture<MedallasComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MedallasComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123', nombre: 'Nicole' }),
          },
        },
        {
          provide: Gamificacion,
          useValue: {
            listarLugaresVisitados: async () => [],
            listarMedallasDeUsuario: async () => [],
            listarTodasLasMedallas: async () => [],
            contarVisitasPorCategoria: async () => ({}),
            contarVisitasTotales: async () => 0,
          },
        },
        {
          provide: Categorias,
          useValue: { listar: async () => [] },
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedallasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});