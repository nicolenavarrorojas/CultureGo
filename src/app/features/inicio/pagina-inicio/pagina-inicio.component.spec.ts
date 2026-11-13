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
  let lugaresDisponibles: { id_lugar: string; nombre: string; destacado: boolean }[];

  beforeEach(waitForAsync(() => {
    usuarioActual = null;
    cambioSesion = new Subject<void>();
    lugaresDisponibles = [];

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
          useValue: { listar: async () => lugaresDisponibles, cambios$: new Subject<void>() },
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

  const crearLugares = (destacados: number, otros: number) => [
    ...Array.from({ length: destacados }, (_, i) => ({ id_lugar: `d${i}`, nombre: `Destacado ${i}`, destacado: true })),
    ...Array.from({ length: otros }, (_, i) => ({ id_lugar: `o${i}`, nombre: `Otro ${i}`, destacado: false })),
  ];

  it('con más de 4 destacados muestra solo 4 y todos son destacados', async () => {
    lugaresDisponibles = crearLugares(7, 5);
    await component['cargarDestacados']();

    expect(component.lugaresDestacados.length).toBe(4);
    expect(component.lugaresDestacados.every((l) => l.id_lugar.startsWith('d'))).toBeTrue();
  });

  it('con menos de 4 destacados completa con otros lugares', async () => {
    lugaresDisponibles = crearLugares(2, 5);
    await component['cargarDestacados']();

    const ids = component.lugaresDestacados.map((l) => l.id_lugar);
    expect(ids.length).toBe(4);
    expect(ids).toContain('d0');
    expect(ids).toContain('d1');
  });

  it('al volver a Inicio vuelve a sortear entre los destacados', async () => {
    lugaresDisponibles = crearLugares(8, 0);
    await component['cargarDestacados']();
    const aleatorio = spyOn(Math, 'random').and.returnValue(0);

    await component.ionViewWillEnter();

    expect(aleatorio).toHaveBeenCalled();
    expect(component.lugaresDestacados.length).toBe(4);
  });
});