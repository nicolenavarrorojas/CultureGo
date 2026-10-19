/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { Lugares } from 'src/app/core/services/lugares';
import { PaginaInicioComponent } from './pagina-inicio.component';

describe('PaginaInicioComponent', () => {
  let component: PaginaInicioComponent;
  let fixture: ComponentFixture<PaginaInicioComponent>;
  let usuarioActual: { nombre: string } | null;

  beforeEach(waitForAsync(() => {
    usuarioActual = null;

    TestBed.configureTestingModule({
      imports: [PaginaInicioComponent],
      providers: [
        {
          provide: Auth,
          useValue: { obtenerUsuarioActual: async () => usuarioActual },
        },
        {
          provide: Lugares,
          useValue: { listar: async () => [] },
        },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaInicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('actualiza el saludo cada vez que se vuelve a la pantalla (sin recargar)', async () => {
    // Primera entrada, sin sesión: saludo anónimo
    await component.ionViewWillEnter();
    expect(component.nombreUsuario).toBe('');

    // El usuario inicia sesión y vuelve a Inicio: saludo con nombre
    usuarioActual = { nombre: 'Nicole Navarro' };
    await component.ionViewWillEnter();
    expect(component.nombreUsuario).toBe('Nicole');

    // Cierra sesión desde Perfil y vuelve a Inicio
    usuarioActual = null;
    await component.ionViewWillEnter();
    expect(component.nombreUsuario).toBe('');
  });
});