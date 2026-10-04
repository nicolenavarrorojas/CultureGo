/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

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
          useValue: { registrarse: async () => ({ session: null }) },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

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
});