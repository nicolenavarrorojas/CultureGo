import { TestBed } from '@angular/core/testing';

import { CONFIGURACION_SUPABASE, Supabase } from './supabase';

describe('Supabase', () => {
  let service: Supabase;
  // Una URL ficticia distinta por prueba: cada cliente usa su propia clave de sesión
  // y no aparece la advertencia «Multiple GoTrueClient instances».
  let numeroPrueba = 0;
  let urlPrueba: string;

  beforeEach(() => {
    // D-04: URL y clave ficticias; la prueba no apunta al proyecto real.
    urlPrueba = `https://proyecto-prueba-${++numeroPrueba}.supabase.co`;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CONFIGURACION_SUPABASE,
          useValue: { url: urlPrueba, anonKey: 'clave-ficticia' },
        },
      ],
    });
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

  it('UT-SUP-02 usa la configuración inyectada y no la del proyecto real', () => {
    expect((service.client as any).supabaseUrl).toBe(urlPrueba);
  });
});
