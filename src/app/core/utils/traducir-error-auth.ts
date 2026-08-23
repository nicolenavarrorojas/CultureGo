/**
 * Funcion para traducir mensajes de error de autenticación de Supabase a español.
 */
export function traducirErrorAuth(error: unknown): string {
  const mensajeOriginal = error instanceof Error ? error.message : '';

  const traducciones: Array<[string, string]> = [
    ['Invalid login credentials', 'Correo o contraseña incorrectos.'],
    ['Email not confirmed', 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'],
    ['User already registered', 'Ese correo ya está registrado. Intenta iniciar sesión.'],
    ['Unable to validate email address: invalid format', 'El correo electrónico no tiene un formato válido.'],
    ['Password should be at least', 'La contraseña es muy corta.'],
    ['Email rate limit exceeded', 'Se enviaron demasiados correos seguidos. Espera un momento e intenta de nuevo.'],
    ['Network request failed', 'No hay conexión a internet. Revisa tu red e intenta de nuevo.'],
  ];

  const coincidencia = traducciones.find(([clave]) =>
    mensajeOriginal.toLowerCase().includes(clave.toLowerCase())
  );

  return coincidencia ? coincidencia[1] : 'Ocurrió un error. Intenta de nuevo.';
}