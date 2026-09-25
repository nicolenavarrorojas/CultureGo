import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionAvatar, ParteAvatar } from 'src/app/core/models';

const RUTA_AVATARES = 'assets/avatares';
const RUTA_BASE = `${RUTA_AVATARES}/base.png`;
const PARTES: ParteAvatar[] = ['cuerpo', 'cabeza', 'ojos', 'boca'];

/** Compone las capas del avatar (base + cuerpo/cabeza/ojos/boca). */
@Component({
  selector: 'app-avatar-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-preview.component.html',
  styleUrls: ['./avatar-preview.component.scss'],
})
export class AvatarPreviewComponent {
  @Input() indices: ConfiguracionAvatar | null = null;
  @Input() ajuste: 'contain' | 'cover' = 'contain';

  readonly rutaBase = RUTA_BASE;
  readonly partes = PARTES;

  urlParte(parte: ParteAvatar): string | null {
    const indice = this.indices?.[parte] ?? 0;
    return indice > 0 ? `${RUTA_AVATARES}/${parte}/${parte}-${indice}.png` : null;
  }
}
