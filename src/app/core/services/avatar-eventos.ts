import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ConfiguracionAvatar } from 'src/app/core/models';

export interface AvatarActualizado {
  idUsuario: string;
  configuracion: ConfiguracionAvatar;
}

/**
 * Canal compartido para avisar que un usuario guardó su avatar.
 * Permite que Perfil se actualice al instante sin depender de ionViewWillEnter,
 * que Ionic no siempre dispara al volver desde una página fuera de las tabs.
 */
@Injectable({ providedIn: 'root' })
export class AvatarEventos {
  private readonly avatarActualizadoSubject = new Subject<AvatarActualizado>();
  readonly avatarActualizado$ = this.avatarActualizadoSubject.asObservable();

  notificarAvatarActualizado(idUsuario: string, configuracion: ConfiguracionAvatar) {
    // Se emite una copia: PersonalizarAvatar modifica sus índices en el mismo objeto
    // al tocar las flechas, y no queremos que esos cambios sin guardar se filtren.
    this.avatarActualizadoSubject.next({
      idUsuario,
      configuracion: { ...configuracion },
    });
  }
}