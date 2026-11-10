/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificarCodigoComponent } from './verificar-codigo.component';

describe('VerificarCodigoComponent', () => {
  let component: VerificarCodigoComponent;
  let fixture: ComponentFixture<VerificarCodigoComponent>;

  // Sin waitForAsync: esperaría a que termine la cuenta regresiva de 60 s del
  // reenvío y la prueba se cortaría a los 5 s.
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarCodigoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificarCodigoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Detiene el temporizador del reenvío
  afterEach(() => fixture.destroy());

  function escribir(valor: string) {
    component.onInput({ target: { value: valor } } as unknown as Event);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('UT-COD-01 deja solo dígitos y corta al largo del código', () => {
    escribir('12a3-456789');
    expect(component.codigo).toBe('123456');
    expect(component.codigoValido).toBeTrue();
  });

  it('UT-COD-02 solo emite el código cuando está completo', () => {
    const emitir = spyOn(component.verificar, 'emit');

    escribir('123');
    component.enviar(new Event('submit'));
    expect(emitir).not.toHaveBeenCalled();

    escribir('123456');
    component.enviar(new Event('submit'));
    expect(emitir).toHaveBeenCalledOnceWith('123456');
  });

  it('UT-COD-03 no deja reenviar mientras corre la espera', () => {
    const emitir = spyOn(component.reenviar, 'emit');

    component.pedirReenvio();
    expect(emitir).not.toHaveBeenCalled();

    component.segundosRestantes = 0;
    component.pedirReenvio();
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(component.segundosRestantes).toBeGreaterThan(0);
  });
});