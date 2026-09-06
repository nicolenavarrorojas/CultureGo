/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SugerenciasLugar } from 'src/app/core/services/sugerencias-lugar';
import { Categorias } from 'src/app/core/services/categorias';
import { Auth } from 'src/app/core/services/auth';
import { SugerirLugarComponent } from './sugerir-lugar.component';

describe('SugerirLugarComponent', () => {
  let component: SugerirLugarComponent;
  let fixture: ComponentFixture<SugerirLugarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SugerirLugarComponent],
      providers: [
        { provide: SugerenciasLugar, useValue: { crear: async () => ({}) } },
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
});