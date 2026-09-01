/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Admin } from 'src/app/core/services/admin';
import { Lugares } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { Auth } from 'src/app/core/services/auth';
import { GestionLugaresComponent } from './gestion-lugares.component';

describe('GestionLugaresComponent', () => {
  let component: GestionLugaresComponent;
  let fixture: ComponentFixture<GestionLugaresComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [GestionLugaresComponent],
      providers: [
        {
          provide: Admin,
          useValue: {
            crearLugar: async () => ({}),
            editarLugar: async () => ({}),
            eliminarLugar: async () => undefined,
            listarReportes: async () => [],
            resolverReporte: async () => undefined,
            subirImagenLugar: async () => 'https://ejemplo.com/imagen.jpg',
            eliminarImagenLugar: async () => undefined,
          },
        },
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
          useValue: { cerrarSesion: async () => undefined },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
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
});