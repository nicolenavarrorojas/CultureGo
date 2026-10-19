import { TestBed } from '@angular/core/testing';

import { Supabase } from './supabase';

describe('Supabase', () => {
  let service: Supabase;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Supabase);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('UT-SUP-01 expone un client con from/auth/storage/rpc, sin llamadas de red', () => {
    expect(service.client).toBeTruthy();
    expect(typeof service.client.from).toBe('function');
    expect(typeof service.client.auth.getUser).toBe('function');
    expect(typeof service.client.storage.from).toBe('function');
    expect(typeof service.client.rpc).toBe('function');
  });
});
