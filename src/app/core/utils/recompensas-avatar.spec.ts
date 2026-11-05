/// <reference types="jasmine" />

import { obtenerRecompensaBloqueada, quitarPiezasBloqueadas } from './recompensas-avatar';

describe('recompensas-avatar', () => {
  const porDefecto = { cabeza: 0, ojos: 2, boca: 6, cuerpo: 0 };

  it('UT-AVA-01 cuerpo-2 está bloqueado sin la medalla «Primer paso»', () => {
    const recompensa = obtenerRecompensaBloqueada('cuerpo', 2, new Set());
    expect(recompensa?.nombreMedalla).toBe('Primer paso');
  });

  it('UT-AVA-02 cuerpo-2 queda libre con la medalla «Primer paso»', () => {
    expect(obtenerRecompensaBloqueada('cuerpo', 2, new Set(['Primer paso']))).toBeNull();
  });

  it('UT-AVA-03 las demás piezas están libres', () => {
    expect(obtenerRecompensaBloqueada('cuerpo', 1, new Set())).toBeNull();
    expect(obtenerRecompensaBloqueada('cabeza', 2, new Set())).toBeNull();
  });

  it('UT-AVA-04 sin la medalla, el cuerpo bloqueado vuelve al de por defecto y el resto se conserva', () => {
    const configuracion = { cabeza: 3, ojos: 4, boca: 5, cuerpo: 2 };
    expect(quitarPiezasBloqueadas(configuracion, new Set(), porDefecto)).toEqual({
      cabeza: 3,
      ojos: 4,
      boca: 5,
      cuerpo: 0,
    });
  });

  it('UT-AVA-05 con la medalla, la configuración no cambia', () => {
    const configuracion = { cabeza: 3, ojos: 4, boca: 5, cuerpo: 2 };
    expect(quitarPiezasBloqueadas(configuracion, new Set(['Primer paso']), porDefecto)).toEqual(configuracion);
  });
});
