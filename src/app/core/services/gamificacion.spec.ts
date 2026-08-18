import { TestBed } from '@angular/core/testing';

import { Gamificacion } from './gamificacion';

describe('Gamificacion', () => {
  let service: Gamificacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Gamificacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
