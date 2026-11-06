/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { RegistroComponent } from './registro.component';

describe('RegistroComponent', () => {
  let component: RegistroComponent;
  let fixture: ComponentFixture<RegistroComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RegistroComponent],
      providers: [
        {
          provide: Auth,
          useValue: {
            registrarse: async () => ({ session: null }),
            verificarCodigoRegistro: async () => ({}),
            reenviarCodigoRegistro: async () => undefined,
          },
        },
        // Router real (Ionic lo necesita para sus eventos); la navegación se simula abajo.
        provideRouter([]),
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(RegistroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no deja registrarse sin aceptar los términos y condiciones', () => {
    component.nombre = 'Nicole';
    component.email = 'nicole@example.com';
    component.password = '123456';
    component.confirmarPassword = '123456';

    component.aceptaTerminos = false;
    expect(component.formularioValido).toBeFalse();

    component.aceptaTerminos = true;
    expect(component.formularioValido).toBeTrue();
  });

  function llenarFormulario() {
    component.nombre = 'Nicole';
    component.email = 'nicole@example.com';
    component.password = '123456';
    component.confirmarPassword = '123456';
    component.aceptaTerminos = true;
  }

  it('pasa al paso del código cuando el registro no trae sesión', async () => {
    llenarFormulario();
    await component.registrarse();
    expect(component.paso).toBe('codigo');
  });

  it('vuelve al formulario desde el paso del código', async () => {
    llenarFormulario();
    await component.registrarse();
    component.volverAlFormulario();
    expect(component.paso).toBe('formulario');
  });
});