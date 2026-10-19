/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

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
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

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
});