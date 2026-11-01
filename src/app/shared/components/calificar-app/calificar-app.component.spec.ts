/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';

import { CalificacionesApp } from 'src/app/core/services/calificaciones-app';
import { Auth } from 'src/app/core/services/auth';
import { CalificarAppComponent } from './calificar-app.component';

describe('CalificarAppComponent', () => {
  let component: CalificarAppComponent;
  let fixture: ComponentFixture<CalificarAppComponent>;
  let servicio: jasmine.SpyObj<CalificacionesApp>;

  beforeEach(waitForAsync(() => {
    servicio = jasmine.createSpyObj<CalificacionesApp>('CalificacionesApp', ['obtenerMia', 'guardar']);
    servicio.obtenerMia.and.resolveTo(null);
    servicio.guardar.and.resolveTo({} as any);

    TestBed.configureTestingModule({
      imports: [CalificarAppComponent],
      providers: [
        { provide: CalificacionesApp, useValue: servicio },
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalificarAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sin estrellas el formulario no es válido', () => {
    expect(component.formularioValido).toBeFalse();
    component.seleccionarEstrella(4);
    expect(component.formularioValido).toBeTrue();
  });

  it('al abrir precarga la calificación previa del usuario', async () => {
    servicio.obtenerMia.and.resolveTo({
      calificacion: 3,
      comentario: 'Buena app',
    } as any);

    component.abierto = true;
    component.ngOnChanges({ abierto: new SimpleChange(false, true, false) });
    await new Promise((resolver) => setTimeout(resolver));

    expect(servicio.obtenerMia).toHaveBeenCalledWith('abc-123');
    expect(component.calificacion).toBe(3);
    expect(component.comentario).toBe('Buena app');
    expect(component.yaCalifico).toBeTrue();
  });

  it('enviar guarda la calificación con el comentario recortado', async () => {
    component.seleccionarEstrella(5);
    component.comentario = '  Me encanta  ';

    await component.enviar();

    expect(servicio.guardar).toHaveBeenCalledWith({
      id_usuario: 'abc-123',
      calificacion: 5,
      comentario: 'Me encanta',
    });
  });

  it('comentario vacío se guarda como null', async () => {
    component.seleccionarEstrella(2);
    component.comentario = '   ';

    await component.enviar();

    expect(servicio.guardar).toHaveBeenCalledWith(
      jasmine.objectContaining({ comentario: null })
    );
  });
});
