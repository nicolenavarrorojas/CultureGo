/// <reference types="jasmine" />

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth } from 'src/app/core/services/auth';
import { RestablecerPasswordComponent } from './restablecer-password.component';

describe('RestablecerPasswordComponent', () => {
  let component: RestablecerPasswordComponent;
  let fixture: ComponentFixture<RestablecerPasswordComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RestablecerPasswordComponent],
      providers: [
        { provide: Auth, useValue: { actualizarPassword: async () => undefined } },
        { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestablecerPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});