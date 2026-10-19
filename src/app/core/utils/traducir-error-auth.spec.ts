import { traducirErrorAuth } from './traducir-error-auth';

describe('traducirErrorAuth', () => {
  it('UT-ERR-01 Invalid login credentials -> credenciales incorrectas', () => {
    expect(traducirErrorAuth(new Error('Invalid login credentials'))).toBe(
      'Correo o contraseña incorrectos.'
    );
  });

  it('UT-ERR-02 User already registered -> correo ya registrado', () => {
    expect(traducirErrorAuth(new Error('User already registered'))).toBe(
      'Ese correo ya está registrado. Intenta iniciar sesión.'
    );
  });

  it('UT-ERR-03 Email not confirmed -> confirmar correo', () => {
    expect(traducirErrorAuth(new Error('Email not confirmed'))).toBe(
      'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
    );
  });

  it('UT-ERR-04 Password should be at least -> contraseña corta', () => {
    expect(traducirErrorAuth(new Error('Password should be at least 6 characters'))).toBe(
      'La contraseña es muy corta.'
    );
  });

  it('UT-ERR-05 Email rate limit exceeded -> demasiados intentos', () => {
    expect(traducirErrorAuth(new Error('Email rate limit exceeded'))).toBe(
      'Se enviaron demasiados correos seguidos. Espera un momento e intenta de nuevo.'
    );
  });

  it('UT-ERR-06 TypeError Failed to fetch -> debería dar mensaje de conexión', () => {
    expect(traducirErrorAuth(new TypeError('Failed to fetch'))).toBe(
      'No hay conexión a internet. Revisa tu red e intenta de nuevo.'
    );
  });

  it('UT-ERR-07 duck typing: objeto plano con message da la misma traducción que un Error', () => {
    const porError = traducirErrorAuth(new Error('Invalid login credentials'));
    const porObjetoPlano = traducirErrorAuth({ message: 'Invalid login credentials' });
    expect(porObjetoPlano).toBe(porError);
  });

  it('UT-ERR-08 mensaje desconocido -> genérico, sin mostrar el texto en inglés', () => {
    const resultado = traducirErrorAuth(new Error('Some unexpected provider error'));
    expect(resultado).toBe('Ocurrió un error. Intenta de nuevo.');
    expect(resultado).not.toContain('unexpected provider error');
  });

  it('UT-ERR-09 entradas sin forma de error no deberían lanzar y dar un mensaje genérico', () => {
    expect(() => traducirErrorAuth({})).not.toThrow();
    expect(() => traducirErrorAuth('texto plano')).not.toThrow();
    expect(() => traducirErrorAuth(null)).not.toThrow();
    expect(() => traducirErrorAuth(undefined)).not.toThrow();

    expect(traducirErrorAuth({})).toBe('Ocurrió un error. Intenta de nuevo.');
    expect(traducirErrorAuth('texto plano')).toBe('Ocurrió un error. Intenta de nuevo.');
    expect(traducirErrorAuth(null)).toBe('Ocurrió un error. Intenta de nuevo.');
    expect(traducirErrorAuth(undefined)).toBe('Ocurrió un error. Intenta de nuevo.');
  });
});
