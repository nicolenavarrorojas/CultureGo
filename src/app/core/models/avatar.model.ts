export interface Avatar {
  id_avatar: string;
  nombre: string;
  url_imagen: string;
  desbloqueable: boolean;
  id_cabeza?: string | null;
  id_ojos?: string | null;
  id_boca?: string | null;
  id_cuerpo?: string | null;
}

export type ParteAvatar = 'cabeza' | 'ojos' | 'boca' | 'cuerpo';

/** Una pieza seleccionable para una de las 4 partes personalizables del avatar. */
export interface OpcionAvatar {
  id_opcion: string;
  parte: ParteAvatar;
  nombre: string;
  url_imagen: string;
  desbloqueable: boolean;
}