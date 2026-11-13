/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';

import { Lugares } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { ListaLugaresComponent } from './lista-lugares.component';

describe('ListaLugaresComponent', () => {
  let component: ListaLugaresComponent;
  let fixture: ComponentFixture<ListaLugaresComponent>;
  let lugaresBase: { id_lugar: string; nombre: string }[];

  beforeEach(waitForAsync(() => {
    lugaresBase = [];
    TestBed.configureTestingModule({
      imports: [ListaLugaresComponent],
      providers: [
        {
          provide: Lugares,
          useValue: { listar: async () => lugaresBase },
        },
        {
          provide: Categorias,
          useValue: { listar: async () => [] },
        },
        {
          provide: Comunas,
          useValue: { listar: async () => [] },
        },
        // Router real (Ionic lo necesita para sus eventos); la navegación se simula abajo.
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ListaLugaresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra los lugares en orden alfabético, ignorando mayúsculas y tildes', async () => {
    lugaresBase = [
      { id_lugar: '1', nombre: 'Parque Bicentenario' },
      { id_lugar: '2', nombre: 'Museo de la Memoria' },
      { id_lugar: '3', nombre: 'álamos Park' },
      { id_lugar: '4', nombre: 'Cerro Santa Lucía' },
    ];

    await component['buscar']();

    expect(component.lugares.map((l) => l.nombre)).toEqual([
      'álamos Park',
      'Cerro Santa Lucía',
      'Museo de la Memoria',
      'Parque Bicentenario',
    ]);
  });

  it('arma el índice con la inicial de cada lugar (sin tildes; Ñ aparte; símbolos en #)', async () => {
    lugaresBase = [
      { id_lugar: '1', nombre: 'Parque Bicentenario' },
      { id_lugar: '2', nombre: 'Ñuñoa Histórica' },
      { id_lugar: '3', nombre: 'Álamos Park' },
      { id_lugar: '4', nombre: 'Norte Verde' },
      { id_lugar: '5', nombre: '3 Cerros' },
      { id_lugar: '6', nombre: 'Anfiteatro' },
    ];

    await component['buscar']();

    expect(component.letras).toEqual(['#', 'A', 'N', 'Ñ', 'P']);
    expect(component.grupos.find((g) => g.letra === 'A')?.lugares.length).toBe(2);
    expect(component.letraActiva).toBe('#');
  });

  it('sin resultados no hay letras en el índice', async () => {
    lugaresBase = [];
    await component['buscar']();
    expect(component.letras).toEqual([]);
    expect(component.grupos).toEqual([]);
  });
});