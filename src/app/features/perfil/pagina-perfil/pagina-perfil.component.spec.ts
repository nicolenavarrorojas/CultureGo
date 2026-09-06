/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Reportes } from 'src/app/core/services/reportes';
import { PaginaPerfilComponent } from './pagina-perfil.component';

describe('PaginaPerfilComponent', () => {
  let component: PaginaPerfilComponent;
  let fixture: ComponentFixture<PaginaPerfilComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PaginaPerfilComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => ({
              id_usuario: 'abc-123',
              nombre: 'Nicole',
              email: 'nicole@example.com',
              es_admin: false,
              fecha_registro: '2026-01-01',
            }),
            cerrarSesion: async () => undefined,
          },
        },
        {
          provide: Gamificacion,
          useValue: {
            contarLugaresVisitados: async () => 3,
            contarCategoriasVisitadas: async () => 2,
            listarMedallasDeUsuario: async () => [],
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
        },
        {
          provide: Reportes,
          useValue: { crear: async () => ({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaPerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});