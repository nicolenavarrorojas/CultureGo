import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export const LARGO_CODIGO = 6;
const SEGUNDOS_ESPERA_REENVIO = 60;

/**
 * Paso "ingresa el código" que llega por correo. Solo muestra el campo y
 * avisa con eventos, quien lo usa llama a Auth.
 */
@Component({
  selector: 'app-verificar-codigo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verificar-codigo.component.html',
  styleUrls: ['./verificar-codigo.component.scss'],
})
export class VerificarCodigoComponent implements OnInit, OnDestroy {
  @Input() email = '';
  @Input() titulo = 'Revisa tu correo';
  @Input() textoBoton = 'Verificar';
  @Input() textoVolver = 'Usar otro correo';
  @Input() cargando = false;

  @Output() verificar = new EventEmitter<string>();
  @Output() reenviar = new EventEmitter<void>();
  @Output() volver = new EventEmitter<void>();

  readonly largo = LARGO_CODIGO;
  codigo = '';
  segundosRestantes = SEGUNDOS_ESPERA_REENVIO;

  private temporizador?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.iniciarEspera();
  }

  ngOnDestroy() {
    clearInterval(this.temporizador);
  }

  get codigoValido(): boolean {
    return this.codigo.length === LARGO_CODIGO;
  }

  /** Deja solo dígitos y corta al largo del código (también al pegar). */
  onInput(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    this.codigo = campo.value.replace(/\D/g, '').slice(0, LARGO_CODIGO);
    campo.value = this.codigo;
  }

  enviar(evento: Event) {
    evento.preventDefault();
    if (!this.codigoValido || this.cargando) return;
    this.verificar.emit(this.codigo);
  }

  pedirReenvio() {
    if (this.segundosRestantes > 0) return;
    this.reenviar.emit();
    this.codigo = '';
    this.iniciarEspera();
  }

  private iniciarEspera() {
    clearInterval(this.temporizador);
    this.segundosRestantes = SEGUNDOS_ESPERA_REENVIO;
    this.temporizador = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) clearInterval(this.temporizador);
    }, 1000);
  }
}