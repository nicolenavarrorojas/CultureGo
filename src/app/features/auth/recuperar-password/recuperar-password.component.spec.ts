/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { RecuperarPasswordComponent } from './recuperar-password.component';

describe('RecuperarPasswordComponent', () => {
  let component: RecuperarPasswordComponent;
  let fixture: ComponentFixture<RecuperarPasswordComponent>;
  let navegar: jasmine.Spy;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RecuperarPasswordComponent],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            recuperarPassword: async () => undefined,
            verificarCodigoRecuperacion: async () => ({}),
          },
        },
      ],
    }).compileComponents();
    navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(RecuperarPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-REC-01 pasa al paso del código después de pedir el correo', async () => {
    component.email = 'nicole@example.com';
    await component.enviarCorreo();
    expect(component.paso).toBe('codigo');
  });

  it('UT-REC-02 con el código correcto va a crear la nueva contraseña', async () => {
    component.email = 'nicole@example.com';
    await component.verificarCodigo('123456');
    expect(navegar).toHaveBeenCalledWith('/auth/restablecer');
  });
});