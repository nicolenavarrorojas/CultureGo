/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { Lugares } from 'src/app/core/services/lugares';
import { PaginaInicioComponent } from './pagina-inicio.component';

describe('PaginaInicioComponent', () => {
  let component: PaginaInicioComponent;
  let fixture: ComponentFixture<PaginaInicioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PaginaInicioComponent],
      providers: [
        {
          provide: Auth,
          useValue: { obtenerUsuarioActual: async () => null },
        },
        {
          provide: Lugares,
          useValue: { listar: async () => [] },
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
});