import { traducirErrorAuth } from './traducir-error-auth';

/**
 * Traduce los errores de los códigos por correo. Un código malo o vencido
 * llega de Supabase como "Token has expired or is invalid"
 */
export function traducirErrorCodigo(error: unknown): string {
  const mensaje =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';

  if (/expired|invalid/i.test(mensaje)) {
    return 'El código es incorrecto o ya venció. Revisa tu correo o pide uno nuevo.';
  }
  return traducirErrorAuth(error);
}