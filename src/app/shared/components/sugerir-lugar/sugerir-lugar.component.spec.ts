/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Categorias } from 'src/app/core/services/categorias';
import { Auth } from 'src/app/core/services/auth';
import { SugerirLugarComponent } from './sugerir-lugar.component';

describe('SugerirLugarComponent', () => {
  let component: SugerirLugarComponent;
  let fixture: ComponentFixture<SugerirLugarComponent>;
  let sugerenciasMock: { crear: jasmine.Spy };

  beforeEach(waitForAsync(() => {
    sugerenciasMock = { crear: jasmine.createSpy().and.resolveTo({}) };

    TestBed.configureTestingModule({
      imports: [SugerirLugarComponent],
      providers: [
        { provide: SugerenciasLugar, useValue: sugerenciasMock },
        { provide: Categorias, useValue: { listar: async () => [] } },
        {
          provide: Auth,
          useValue: { obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123' }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SugerirLugarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-CMP-02 sin nombre, categoría o coordenadas seleccionadas, el formulario es inválido', async () => {
    component.nombre = '';
    component.idCategoria = null;
    component.latitudSeleccionada = null;
    component.longitudSeleccionada = null;
    expect(component.formularioValido).toBeFalse();

    component.nombre = 'Plaza de prueba';
    expect(component.formularioValido).toBeFalse();

    component.idCategoria = 'cat-1';
    expect(component.formularioValido).toBeFalse();

    component.latitudSeleccionada = -33.45;
    component.longitudSeleccionada = -70.65;
    expect(component.formularioValido).toBeTrue();

    component.nombre = '';
    await component.enviar();
    expect(sugerenciasMock.crear).not.toHaveBeenCalled();
  });
});