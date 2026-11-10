/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Reportes } from 'src/app/core/services/reportes';
import { CalificacionesApp } from 'src/app/core/services/calificaciones-app';
import { Categorias } from 'src/app/core/services/categorias';
import { AvatarService } from 'src/app/core/services/avatar';
import { PaginaPerfilComponent } from './pagina-perfil.component';

describe('PaginaPerfilComponent', () => {
  let component: PaginaPerfilComponent;
  let fixture: ComponentFixture<PaginaPerfilComponent>;

  let usuarioActual: { id_usuario: string; nombre: string } | null;
  let lugaresVisitados: number;

  beforeEach(waitForAsync(() => {
    usuarioActual = { id_usuario: 'abc-123', nombre: 'Nicole' };
    lugaresVisitados = 3;

    TestBed.configureTestingModule({
      imports: [PaginaPerfilComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => usuarioActual,
            cerrarSesion: async () => undefined,
          },
        },
        {
          provide: Gamificacion,
          useValue: {
            contarLugaresVisitados: async () => lugaresVisitados,
            contarCategoriasVisitadas: async () => 2,
            listarMedallasDeUsuario: async () => [],
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
        },
        {
          provide: Reportes,
          useValue: { crear: async () => ({}) },
        },
        {
          provide: CalificacionesApp,
          useValue: { obtenerMia: async () => null, guardar: async () => ({}) },
        },
        {
          provide: Categorias,
          useValue: { listar: async () => [] },
        },
        {
          provide: AvatarService,
          useValue: {
            obtenerConfiguracion: async () => ({ cabeza: 0, ojos: 2, boca: 6, cuerpo: 0 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaPerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('al entrar con otra cuenta descarta los datos de la anterior', async () => {
    await component.ionViewWillEnter();
    expect(component.usuario?.nombre).toBe('Nicole');
    expect(component.totalLugaresVisitados).toBe(3);

    usuarioActual = { id_usuario: 'xyz-789', nombre: 'Benjamín' };
    lugaresVisitados = 7;
    await component.ionViewWillEnter();

    expect(component.usuario?.nombre).toBe('Benjamín');
    expect(component.totalLugaresVisitados).toBe(7);
  });

  it('al volver con la misma cuenta refresca sin mostrar el esqueleto de carga', async () => {
    await component.ionViewWillEnter();
    expect(component.cargando).toBeFalse();

    lugaresVisitados = 4; 
    const recarga = component.ionViewWillEnter();
    expect(component.cargando).toBeFalse(); 
    await recarga;

    expect(component.totalLugaresVisitados).toBe(4);
  });

  it('UT-PER-03 pide confirmación antes de cerrar sesión y no la cierra por sí solo', async () => {
    const alerta = { present: jasmine.createSpy('present').and.resolveTo() };
    const crear = spyOn(TestBed.inject(AlertController), 'create').and.resolveTo(alerta as never);
    const cerrar = spyOn(TestBed.inject(Auth), 'cerrarSesion').and.callThrough();

    await component.cerrarSesion();

    expect(crear).toHaveBeenCalled();
    expect(alerta.present).toHaveBeenCalled();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('UT-PER-04 sin sesión muestra la vista de invitado y no carga estadísticas', async () => {
    usuarioActual = null;
    const estadisticas = spyOn(TestBed.inject(Gamificacion), 'contarLugaresVisitados').and.callThrough();

    await component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.usuario).toBeNull();
    expect(component.cargando).toBeFalse();
    expect(estadisticas).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.bloque-invitado')).not.toBeNull();
  });

  it('UT-PER-05 desde la vista de invitado se puede ir a iniciar sesión y a registrarse', () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.callThrough();

    component.irALogin();
    component.irARegistro();

    expect(navegar).toHaveBeenCalledWith('/auth/login');
    expect(navegar).toHaveBeenCalledWith('/auth/registro');
  });
});