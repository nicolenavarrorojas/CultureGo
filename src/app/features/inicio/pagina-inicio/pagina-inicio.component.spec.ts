/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { Auth } from 'src/app/core/services/auth';
import { Lugares } from 'src/app/core/services/lugares';
import { PaginaInicioComponent } from './pagina-inicio.component';

describe('PaginaInicioComponent', () => {
  let component: PaginaInicioComponent;
  let fixture: ComponentFixture<PaginaInicioComponent>;
  let usuarioActual: { nombre: string } | null;
  let cambioSesion: Subject<void>;

  beforeEach(waitForAsync(() => {
    usuarioActual = null;
    cambioSesion = new Subject<void>();

    TestBed.configureTestingModule({
      imports: [PaginaInicioComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => usuarioActual,
            cambioSesion$: cambioSesion.asObservable(),
          },
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

  it('UT-INI-02 actualiza el saludo cuando cambia la sesión, aunque no se vuelva a entrar a la pantalla', async () => {
    usuarioActual = { nombre: 'Nicole Navarro' };
    cambioSesion.next();
    await fixture.whenStable();
    expect(component.nombreUsuario).toBe('Nicole');
  });
});