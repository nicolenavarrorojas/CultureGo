import { TestBed } from '@angular/core/testing';

import { Lugares } from './lugares';

describe('Lugares', () => {
  let service: Lugares;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Lugares);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
