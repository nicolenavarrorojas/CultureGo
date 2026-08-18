import { TestBed } from '@angular/core/testing';

import { Comunas } from './comunas';

describe('Comunas', () => {
  let service: Comunas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Comunas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
