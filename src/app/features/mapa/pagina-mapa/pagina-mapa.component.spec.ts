/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { Lugares } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
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
    // Limpia el mapa de Leaflet y otros recursos para evitar fugas de memoria entre pruebas
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});