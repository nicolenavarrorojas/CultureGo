/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminosCondicionesComponent } from './terminos-condiciones.component';

describe('TerminosCondicionesComponent', () => {
  let fixture: ComponentFixture<TerminosCondicionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminosCondicionesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerminosCondicionesComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el título de los términos', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Términos de Servicio de CultureGo');
  });
});