import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionAvatar, ParteAvatar } from 'src/app/core/models';

const RUTA_AVATARES = 'assets/avatares';
const RUTA_BASE = `${RUTA_AVATARES}/base.png`;

// De abajo hacia arriba, mismo orden de capas usado en personalizar-avatar.
const PARTES: ParteAvatar[] = ['cuerpo', 'cabeza', 'ojos', 'boca'];

/** Compone las capas del avatar (base + cuerpo/cabeza/ojos/boca) a partir de una ConfiguracionAvatar. */
@Component({
  selector: 'app-avatar-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-preview.component.html',
  styleUrls: ['./avatar-preview.component.scss'],
})
export class AvatarPreviewComponent {
  @Input() indices: ConfiguracionAvatar | null = null;
  /** 'contain' muestra la figura completa (edición); 'cover' recorta para llenar un círculo (foto de perfil). */
  @Input() ajuste: 'contain' | 'cover' = 'contain';

  readonly rutaBase = RUTA_BASE;
  readonly partes = PARTES;

  urlParte(parte: ParteAvatar): string | null {
    const indice = this.indices?.[parte] ?? 0;
    return indice > 0 ? `${RUTA_AVATARES}/${parte}/${parte}-${indice}.png` : null;
  }
}
