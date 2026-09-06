import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonSkeletonText,
  IonToast,
  IonModal,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  logOutOutline,
  addOutline,
  createOutline,
  trashOutline,
  closeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import { Admin } from 'src/app/core/services/admin';
import { Lugares } from 'src/app/core/services/lugares';
import { Categorias } from 'src/app/core/services/categorias';
import { Comunas } from 'src/app/core/services/comunas';
import { Auth } from 'src/app/core/services/auth';
import { Lugar, Reporte, LugarSugerido } from 'src/app/core/models';

type Segmento = 'lugares' | 'reportes' | 'sugerencias';
type EstadoReporte = Reporte['estado'];

interface FormularioLugar {
  nombre: string;
  descripcion: string;
  id_categoria: string | null;
  id_comuna: string | null;
  es_gratuito: boolean;
  direccion: string;
  horario: string;
  telefono: string;
  email_contacto: string;
  url_imagen_principal: string;
  latitud: number | null;
  longitud: number | null;
}

const FORMULARIO_VACIO: FormularioLugar = {
  nombre: '',
  descripcion: '',
  id_categoria: null,
  id_comuna: null,
  es_gratuito: false,
  direccion: '',
  horario: '',
  telefono: '',
  email_contacto: '',
  url_imagen_principal: '',
  latitud: null,
  longitud: null,
};

const ETIQUETAS_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
};

@Component({
  selector: 'app-gestion-lugares',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    IonSkeletonText,
    IonToast,
    IonModal,
  ],
  templateUrl: './gestion-lugares.component.html',
  styleUrls: ['./gestion-lugares.component.scss'],
})
export class GestionLugaresComponent implements OnInit {
  segmentoActivo: Segmento = 'lugares';
  cargando = true;
  guardando = false;
  subiendoImagen = false;

  lugares: Lugar[] = [];
  reportes: Reporte[] = [];
  sugerencias: LugarSugerido[] = [];

  categorias: { id_categoria: string; nombre: string }[] = [];
  comunas: { id_comuna: string; nombre: string }[] = [];

  mostrarFormulario = false;
  lugarEditandoId: string | null = null;
  sugerenciaAprobandoId: string | null = null; 
  formulario: FormularioLugar = { ...FORMULARIO_VACIO };

  toastMensaje = '';
  mostrarToast = false;

  readonly etiquetasEstadoReporte = ETIQUETAS_ESTADO_REPORTE;

  constructor(
    private adminService: Admin,
    private lugaresService: Lugares,
    private categoriasService: Categorias,
    private comunasService: Comunas,
    private authService: Auth,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      logOutOutline,
      addOutline,
      createOutline,
      trashOutline,
      closeOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit() {
    await Promise.all([this.cargarCategorias(), this.cargarComunas()]);
    await this.cambiarSegmento('lugares');
  }

  private async cargarCategorias() {
    this.categorias = await this.categoriasService.listar();
  }

  private async cargarComunas() {
    this.comunas = await this.comunasService.listar();
  }

  async cambiarSegmento(segmento: string | number | undefined) {
    if (segmento !== 'lugares' && segmento !== 'reportes' && segmento !== 'sugerencias') return;
    this.segmentoActivo = segmento;

    this.cargando = true;
    try {
      if (segmento === 'lugares') {
        this.lugares = await this.lugaresService.listar({});
      } else if (segmento === 'reportes') {
        this.reportes = await this.adminService.listarReportes(['pendiente', 'en_revision']);
      } else {
        this.sugerencias = await this.adminService.listarSugerenciasLugar(true);
      }
    } finally {
      this.cargando = false;
    }
  }

  // CRUD de lugares

  abrirFormularioNuevo() {
    this.lugarEditandoId = null;
    this.sugerenciaAprobandoId = null;
    this.formulario = { ...FORMULARIO_VACIO };
    this.mostrarFormulario = true;
  }

  abrirFormularioEditar(lugar: Lugar) {
    this.lugarEditandoId = lugar.id_lugar;
    this.sugerenciaAprobandoId = null;
    this.formulario = {
      nombre: lugar.nombre,
      descripcion: lugar.descripcion ?? '',
      id_categoria: lugar.id_categoria,
      id_comuna: lugar.id_comuna,
      es_gratuito: lugar.es_gratuito,
      direccion: lugar.direccion ?? '',
      horario: lugar.horario ?? '',
      telefono: lugar.telefono ?? '',
      email_contacto: lugar.email_contacto ?? '',
      url_imagen_principal: lugar.url_imagen_principal ?? '',
      latitud: lugar.latitud,
      longitud: lugar.longitud,
    };
    this.mostrarFormulario = true;
  }

  /** Abre el formulario de "Nuevo lugar" precargado con los datos de una
   * sugerencia de un usuario. Al guardar, además de crear el lugar, la
   * sugerencia queda marcada como aprobada (ver guardarLugar()). */
  abrirFormularioDesdeSugerencia(sugerencia: LugarSugerido) {
    this.lugarEditandoId = null;
    this.sugerenciaAprobandoId = sugerencia.id_lugar_sugerido;
    this.formulario = {
      ...FORMULARIO_VACIO,
      nombre: sugerencia.nombre,
      descripcion: sugerencia.descripcion ?? '',
      id_categoria: sugerencia.id_categoria,
      latitud: sugerencia.latitud,
      longitud: sugerencia.longitud,
    };
    this.mostrarFormulario = true;
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
  }

  get formularioValido(): boolean {
    return (
      this.formulario.nombre.trim().length > 0 &&
      !!this.formulario.id_categoria &&
      !!this.formulario.id_comuna
    );
  }

  async onArchivoSeleccionado(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      this.mostrarAviso('Solo se permiten archivos de imagen.');
      input.value = '';
      return;
    }
    const TAMANO_MAXIMO_MB = 5;
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      this.mostrarAviso(`La imagen no puede pesar más de ${TAMANO_MAXIMO_MB}MB.`);
      input.value = '';
      return;
    }

    const urlAnterior = this.formulario.url_imagen_principal;

    this.subiendoImagen = true;
    try {
      const url = await this.adminService.subirImagenLugar(archivo);
      this.formulario.url_imagen_principal = url;

      await this.eliminarImagenSiEsPropia(urlAnterior);
    } catch {
      this.mostrarAviso('No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      this.subiendoImagen = false;
      input.value = '';
    }
  }

  private extraerRutaStorage(url: string): string | null {
    const marcador = '/storage/v1/object/public/lugares/';
    const indice = url.indexOf(marcador);
    if (indice === -1) return null;
    return url.substring(indice + marcador.length);
  }

  private async eliminarImagenSiEsPropia(url: string) {
    if (!url) return;
    const ruta = this.extraerRutaStorage(url);
    if (!ruta) return;

    try {
      await this.adminService.eliminarImagenLugar(ruta);
    } catch {
    }
  }

  async guardarLugar() {
    if (!this.formularioValido || this.guardando) return;

    this.guardando = true;
    try {
      const datos: Partial<Lugar> = {
        nombre: this.formulario.nombre.trim(),
        descripcion: this.formulario.descripcion.trim() || null,
        id_categoria: this.formulario.id_categoria!,
        id_comuna: this.formulario.id_comuna!,
        es_gratuito: this.formulario.es_gratuito,
        direccion: this.formulario.direccion.trim() || null,
        horario: this.formulario.horario.trim() || null,
        telefono: this.formulario.telefono.trim() || null,
        email_contacto: this.formulario.email_contacto.trim() || null,
        url_imagen_principal: this.formulario.url_imagen_principal.trim() || null,
        latitud: this.formulario.latitud,
        longitud: this.formulario.longitud,
      };

      if (this.lugarEditandoId) {
        await this.adminService.editarLugar(this.lugarEditandoId, datos);
        this.mostrarAviso('Lugar actualizado.');
      } else {
        await this.adminService.crearLugar(datos);
        this.mostrarAviso('Lugar creado.');
      }

      // Si este lugar vino de una sugerencia, la marcamos aprobada recién
      // ahora así, si algo falla al crear el lugar, la sugerencia queda
      // tal cual (pendiente)
      if (this.sugerenciaAprobandoId) {
        await this.marcarSugerenciaComo(this.sugerenciaAprobandoId, 'aprobado');
        this.sugerenciaAprobandoId = null;
      }

      this.mostrarFormulario = false;
      this.lugares = await this.lugaresService.listar({});
    } catch {
      this.mostrarAviso('No se pudo guardar el lugar. Intenta de nuevo.');
    } finally {
      this.guardando = false;
    }
  }

  async eliminarLugar(lugar: Lugar) {
    const alerta = await this.alertController.create({
      header: 'Eliminar lugar',
      message: `¿Eliminar "${lugar.nombre}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'boton-alerta-eliminar',
          handler: () => this.confirmarEliminacion(lugar),
        },
      ],
    });
    await alerta.present();
  }

  private async confirmarEliminacion(lugar: Lugar) {
    try {
      await this.adminService.eliminarLugar(lugar.id_lugar);
      if (lugar.url_imagen_principal) {
        await this.eliminarImagenSiEsPropia(lugar.url_imagen_principal);
      }
      this.lugares = this.lugares.filter((l) => l.id_lugar !== lugar.id_lugar);
      this.mostrarAviso('Lugar eliminado.');
    } catch {
      this.mostrarAviso('No se pudo eliminar el lugar.');
    }
  }

  // Reportes - estado (pendiente / en_revision / resuelto)

  async abrirReporte(reporte: Reporte) {
    const alerta = await this.alertController.create({
      header: 'Actualizar estado del reporte',
      message: reporte.descripcion,
      inputs: [
        {
          type: 'radio',
          label: 'Pendiente',
          value: 'pendiente',
          checked: reporte.estado === 'pendiente',
        },
        {
          type: 'radio',
          label: 'En revisión',
          value: 'en_revision',
          checked: reporte.estado === 'en_revision',
        },
        {
          type: 'radio',
          label: 'Resuelto',
          value: 'resuelto',
          checked: reporte.estado === 'resuelto',
        },
        {
          type: 'radio',
          label: 'Rechazado',
          value: 'rechazado',
          checked: reporte.estado === 'rechazado',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (nuevoEstado: EstadoReporte) => this.actualizarEstadoReporte(reporte, nuevoEstado),
        },
      ],
    });
    await alerta.present();
  }

  private async actualizarEstadoReporte(reporte: Reporte, nuevoEstado: EstadoReporte) {
    if (!nuevoEstado || nuevoEstado === reporte.estado) return;

    try {
      await this.adminService.actualizarEstadoReporte(reporte.id_reporte, nuevoEstado);

      if (nuevoEstado === 'resuelto' || nuevoEstado === 'rechazado') {
        this.reportes = this.reportes.filter((r) => r.id_reporte !== reporte.id_reporte);
      } else {
        reporte.estado = nuevoEstado;
      }

      this.mostrarAviso('Estado del reporte actualizado.');
    } catch {
      this.mostrarAviso('No se pudo actualizar el reporte.');
    }
  }

  // Sugerencias de lugar

  async rechazarSugerencia(sugerencia: LugarSugerido) {
    const alerta = await this.alertController.create({
      header: 'Rechazar sugerencia',
      message: `¿Rechazar "${sugerencia.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          role: 'destructive',
          cssClass: 'boton-alerta-eliminar',
          handler: () => this.marcarSugerenciaComo(sugerencia.id_lugar_sugerido, 'rechazado', true),
        },
      ],
    });
    await alerta.present();
  }

  private async marcarSugerenciaComo(
    idSugerencia: string,
    estado: 'aprobado' | 'rechazado',
    quitarDeLaLista = false
  ) {
    try {
      const admin = await this.authService.obtenerUsuarioActual();
      if (!admin) return;

      await this.adminService.marcarSugerenciaRevisada(idSugerencia, admin.id_usuario, estado);

      if (quitarDeLaLista) {
        this.sugerencias = this.sugerencias.filter((s) => s.id_lugar_sugerido !== idSugerencia);
        this.mostrarAviso('Sugerencia rechazada.');
      }
    } catch {
      this.mostrarAviso('No se pudo actualizar la sugerencia.');
    }
  }

  async cerrarSesion() {
    await this.authService.cerrarSesion();
    this.router.navigateByUrl('/auth/login');
  }

  volverAPerfil() {
    this.router.navigateByUrl('/tabs/perfil');
  }

  private mostrarAviso(mensaje: string) {
    this.toastMensaje = mensaje;
    this.mostrarToast = true;
  }
}