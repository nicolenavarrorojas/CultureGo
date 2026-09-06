/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { Lugares } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Auth } from 'src/app/core/services/auth';
import { PaginaMapaComponent } from './pagina-mapa.component';

describe('PaginaMapaComponent', () => {
  let component: PaginaMapaComponent;
  let fixture: ComponentFixture<PaginaMapaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PaginaMapaComponent],
      providers: [
        {
          provide: Lugares,
          useValue: {
            listar: async () => [],
            listarCercanos: async () => [],
          },
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
          provide: SugerenciasLugar,
          useValue: { crear: async () => ({}) },
        },
        {
          provide: Auth,
          useValue: { obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123' }) },
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaMapaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});