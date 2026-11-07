/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { ConfiguracionComponent } from './configuracion.component';

describe('ConfiguracionComponent', () => {
  let component: ConfiguracionComponent;
  let fixture: ComponentFixture<ConfiguracionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            obtenerUsuarioActual: async () => ({ id_usuario: 'abc-123', nombre: 'Nicole' }),
            actualizarPerfil: async () => ({ id_usuario: 'abc-123', nombre: 'Nicole' }),
            actualizarPassword: async () => undefined,
            verificarPasswordActual: async () => true,
            eliminarCuenta: async () => undefined,
          },
        },
        // Router real (Ionic lo necesita para sus eventos); la navegación se simula abajo.
        provideRouter([]),
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(ConfiguracionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('la contraseña exige la actual y que la nueva sea distinta', () => {
    component.passwordActual = '';
    component.passwordNueva = 'nueva123';
    component.passwordConfirmar = 'nueva123';
    expect(component.passwordValida).toBeFalse(); 

    component.passwordActual = 'nueva123';
    expect(component.passwordValida).toBeFalse(); 
    expect(component.erroresPassword).toContain('distinta a la actual');

    component.passwordActual = 'vieja123';
    expect(component.passwordValida).toBeTrue();
  });

  it('el nombre sin cambios no se puede guardar', async () => {
    await fixture.whenStable(); 
    component.nombreEditado = 'Nicole';
    expect(component.nombreCambio).toBeFalse();

    component.nombreEditado = 'Nicole N.';
    expect(component.nombreCambio).toBeTrue();
  });

  it('no elimina la cuenta si la contraseña es incorrecta', async () => {
    const auth = TestBed.inject(Auth);
    spyOn(auth, 'verificarPasswordActual').and.resolveTo(false);
    const eliminar = spyOn(auth, 'eliminarCuenta').and.callThrough();

    await component['eliminarConPassword']('incorrecta');

    expect(eliminar).not.toHaveBeenCalled();
    expect(component.eliminandoCuenta).toBeFalse();
  });

  it('elimina la cuenta cuando la contraseña es correcta', async () => {
    const auth = TestBed.inject(Auth);
    spyOn(auth, 'verificarPasswordActual').and.resolveTo(true);
    const eliminar = spyOn(auth, 'eliminarCuenta').and.callThrough();

    await component['eliminarConPassword']('correcta');

    expect(eliminar).toHaveBeenCalledTimes(1);
  });
});