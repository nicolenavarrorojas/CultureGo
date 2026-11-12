import { ConfiguracionAvatar, ParteAvatar } from '../models';

/** Ítem del avatar que se desbloquea al obtener una medalla (RF-27). */
export interface RecompensaAvatar {
  parte: ParteAvatar;
  indice: number; // archivo <parte>-<indice>.png
  nombrePieza: string;
  nombreMedalla: string;
  comoObtenerla: string; // qué debe hacer el usuario para ganar la medalla
}

// La base de datos aplica la misma regla (trigger en usuario): mantener ambas sincronizadas.
export const RECOMPENSAS_AVATAR: RecompensaAvatar[] = [
  {
    parte: 'cuerpo',
    indice: 2,
    nombrePieza: 'Bandera de Chile',
    nombreMedalla: 'Primer paso',
    comoObtenerla: 'Registra tu primera visita',
  },
];

/** Recompensa que bloquea esa pieza para quien no tiene la medalla, o null si está libre. */
export function obtenerRecompensaBloqueada(
  parte: ParteAvatar,
  indice: number,
  medallasObtenidas: ReadonlySet<string>
): RecompensaAvatar | null {
  const recompensa = RECOMPENSAS_AVATAR.find((r) => r.parte === parte && r.indice === indice);
  if (!recompensa || medallasObtenidas.has(recompensa.nombreMedalla)) return null;
  return recompensa;
}

/** Recompensa ya ganada que corresponde a esa pieza, o null si es una pieza común o sigue bloqueada. */
export function obtenerRecompensaDesbloqueada(
  parte: ParteAvatar,
  indice: number,
  medallasObtenidas: ReadonlySet<string>
): RecompensaAvatar | null {
  const recompensa = RECOMPENSAS_AVATAR.find((r) => r.parte === parte && r.indice === indice);
  return recompensa && medallasObtenidas.has(recompensa.nombreMedalla) ? recompensa : null;
}

/**
 * Devuelve la configuración sin piezas bloqueadas: cada pieza bloqueada vuelve
 * a la indicada en porDefecto.
 */
export function quitarPiezasBloqueadas(
  configuracion: ConfiguracionAvatar,
  medallasObtenidas: ReadonlySet<string>,
  porDefecto: ConfiguracionAvatar
): ConfiguracionAvatar {
  const resultado = { ...configuracion };
  (Object.keys(resultado) as ParteAvatar[]).forEach((parte) => {
    if (obtenerRecompensaBloqueada(parte, resultado[parte], medallasObtenidas)) {
      resultado[parte] = porDefecto[parte];
    }
  });
  return resultado;
}
