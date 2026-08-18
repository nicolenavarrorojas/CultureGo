import { TestBed } from '@angular/core/testing';

import { Categorias } from './categorias';

describe('Categorias', () => {
  let service: Categorias;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Categorias);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
