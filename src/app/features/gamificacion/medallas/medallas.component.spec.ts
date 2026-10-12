/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Categorias } from 'src/app/core/services/categorias';
import { MedallasComponent } from './medallas.component';

describe('MedallasComponent', () => {
  let component: MedallasComponent;
  let fixture: ComponentFixture<MedallasComponent>;

  let usuarioActual: { id_usuario: string } | null;
  let lugaresVisitados: any[];
  let medallasGanadas: any[];
  let medallasTodas: any[];
  let conteoPorCategoria: Record<string, number>;
  let totalVisitas: number;
  let categorias: any[];
  let gamificacionMock: {
    listarLugaresVisitados: jasmine.Spy;
    listarMedallasDeUsuario: jasmine.Spy;
    listarTodasLasMedallas: jasmine.Spy;
    contarVisitasPorCategoria: jasmine.Spy;
    contarVisitasTotales: jasmine.Spy;
  };

  beforeEach(waitForAsync(() => {
    usuarioActual = { id_usuario: 'abc-123' };
    lugaresVisitados = [];
    medallasGanadas = [];
    medallasTodas = [];
    conteoPorCategoria = {};
    totalVisitas = 0;
    categorias = [{ id_categoria: 'cat-museo', nombre: 'Museo' }];

    gamificacionMock = {
      listarLugaresVisitados: jasmine.createSpy().and.callFake(() => Promise.resolve(lugaresVisitados)),
      listarMedallasDeUsuario: jasmine.createSpy().and.callFake(() => Promise.resolve(medallasGanadas)),
      listarTodasLasMedallas: jasmine.createSpy().and.callFake(() => Promise.resolve(medallasTodas)),
      contarVisitasPorCategoria: jasmine
        .createSpy()
        .and.callFake(() => Promise.resolve(conteoPorCategoria)),
      contarVisitasTotales: jasmine.createSpy().and.callFake(() => Promise.resolve(totalVisitas)),
    };

    TestBed.configureTestingModule({
      imports: [MedallasComponent],
      providers: [
        { provide: Auth, useValue: { obtenerUsuarioActual: () => Promise.resolve(usuarioActual) } },
        { provide: Gamificacion, useValue: gamificacionMock },
        { provide: Categorias, useValue: { listar: () => Promise.resolve(categorias) } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true), events: of() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedallasComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-MED-01 medalla general, 3 de 10 -> 30%', async () => {
    medallasTodas = [
      { id_medalla: 'm1', nombre: 'Explorador', descripcion: '', id_categoria: null, cantidad_requerida: 10, url_icono: null },
    ];
    totalVisitas = 3;
    await component.ngOnInit();
    const progreso = component.progresoMedallas[0];
    expect(progreso.actual).toBe(3);
    expect(progreso.requerido).toBe(10);
    expect((progreso.actual / progreso.requerido) * 100).toBe(30);
  });

  it('UT-MED-02 medalla de categoría, 2 de 5 -> 40%, solo cuenta su categoría', async () => {
    medallasTodas = [
      { id_medalla: 'm1', nombre: 'Fan del museo', descripcion: '', id_categoria: 'cat-museo', cantidad_requerida: 5, url_icono: null },
    ];
    conteoPorCategoria = { 'cat-museo': 2, 'cat-otra': 99 };
    totalVisitas = 99;
    await component.ngOnInit();
    const progreso = component.progresoMedallas[0];
    expect(progreso.actual).toBe(2);
    expect(progreso.requerido).toBe(5);
  });

  it('UT-MED-03 5 de 5 y presente en listarMedallasDeUsuario -> 100% y obtenida', async () => {
    const medalla = { id_medalla: 'm1', nombre: 'Maestro', descripcion: '', id_categoria: null, cantidad_requerida: 5, url_icono: null };
    medallasTodas = [medalla];
    totalVisitas = 5;
    medallasGanadas = [{ id_usuario: 'abc-123', id_medalla: 'm1', fecha_obtencion: '2026-01-01', medalla }];
    await component.ngOnInit();
    const progreso = component.progresoMedallas[0];
    expect(progreso.obtenida).toBeTrue();
    expect(progreso.actual).toBe(5);
    expect(progreso.requerido).toBe(5);
  });

  it('UT-MED-04 12 de 10 -> actual acotado a 10', async () => {
    medallasTodas = [
      { id_medalla: 'm1', nombre: 'Explorador', descripcion: '', id_categoria: null, cantidad_requerida: 10, url_icono: null },
    ];
    totalVisitas = 12;
    await component.ngOnInit();
    expect(component.progresoMedallas[0].actual).toBe(10);
  });

  it('UT-MED-05 sin visitas -> 0%', async () => {
    medallasTodas = [
      { id_medalla: 'm1', nombre: 'Explorador', descripcion: '', id_categoria: null, cantidad_requerida: 10, url_icono: null },
    ];
    totalVisitas = 0;
    await component.ngOnInit();
    expect(component.progresoMedallas[0].actual).toBe(0);
  });

  it('UT-MED-06 1 de 3: el ratio usado para la barra no debería tener decimales largos', async () => {
    medallasTodas = [
      { id_medalla: 'm1', nombre: 'Explorador', descripcion: '', id_categoria: null, cantidad_requerida: 3, url_icono: null },
    ];
    totalVisitas = 1;
    await component.ngOnInit();
    const progreso = component.progresoMedallas[0];
    const porcentaje = (progreso.actual / progreso.requerido) * 100;
    expect(Number.isInteger(porcentaje)).toBeTrue();
  });

  it('UT-MED-07 cantidad_requerida en 0 no debería producir NaN/Infinity', async () => {
    medallasTodas = [
      { id_medalla: 'm1', nombre: 'Rota', descripcion: '', id_categoria: null, cantidad_requerida: 0, url_icono: null },
    ];
    totalVisitas = 5;
    await component.ngOnInit();
    const progreso = component.progresoMedallas[0];
    const porcentaje = (progreso.actual / progreso.requerido) * 100;
    expect(Number.isFinite(porcentaje)).toBeTrue();
  });

  it('UT-MED-08 ordena: generales primero, luego obtenidas, luego por % descendente', async () => {
    const general = { id_medalla: 'g1', nombre: 'General', descripcion: '', id_categoria: null, cantidad_requerida: 10, url_icono: null };
    const catAlta = { id_medalla: 'c1', nombre: 'Cat alta', descripcion: '', id_categoria: 'cat-museo', cantidad_requerida: 5, url_icono: null };
    const catBaja = { id_medalla: 'c2', nombre: 'Cat baja', descripcion: '', id_categoria: 'cat-museo', cantidad_requerida: 10, url_icono: null };
    medallasTodas = [catBaja, catAlta, general];
    conteoPorCategoria = { 'cat-museo': 4 };
    totalVisitas = 1;
    await component.ngOnInit();
    const orden = component.progresoMedallas.map((p) => p.medalla.id_medalla);
    expect(orden).toEqual(['g1', 'c1', 'c2']);
  });

  it('UT-MED-09 empate en % entre dos no obtenidas: por plan desempata por cantidad_requerida ascendente', async () => {
    const medallaA = { id_medalla: 'ma', nombre: 'A', descripcion: '', id_categoria: 'cat-a', cantidad_requerida: 20, url_icono: null };
    const medallaB = { id_medalla: 'mb', nombre: 'B', descripcion: '', id_categoria: 'cat-b', cantidad_requerida: 10, url_icono: null };
    medallasTodas = [medallaA, medallaB];
    conteoPorCategoria = { 'cat-a': 10, 'cat-b': 5 };
    categorias = [
      { id_categoria: 'cat-a', nombre: 'Categoría A' },
      { id_categoria: 'cat-b', nombre: 'Categoría B' },
    ];
    await component.ngOnInit();
    const orden = component.progresoMedallas.map((p) => p.medalla.id_medalla);
    expect(orden).toEqual(['mb', 'ma']);
  });

  it('UT-MED-10 sin medallas configuradas -> lista vacía, sin errores', async () => {
    medallasTodas = [];
    await component.ngOnInit();
    expect(component.progresoMedallas).toEqual([]);
    expect(component.cargando).toBeFalse();
  });

  it('UT-MED-11 sin usuario no consulta Gamificacion y cargando termina en false', async () => {
    usuarioActual = null;
    await component.ngOnInit();
    expect(gamificacionMock.listarLugaresVisitados).not.toHaveBeenCalled();
    expect(component.cargando).toBeFalse();
  });
});
