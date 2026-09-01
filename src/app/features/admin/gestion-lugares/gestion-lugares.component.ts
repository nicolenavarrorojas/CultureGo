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
import { Lugar, Reporte } from 'src/app/core/models';

type Segmento = 'lugares' | 'reportes';

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

  lugares: Lugar[] = [];
  reportes: Reporte[] = [];

  categorias: { id_categoria: string; nombre: string }[] = [];
  comunas: { id_comuna: string; nombre: string }[] = [];

  mostrarFormulario = false;
  lugarEditandoId: string | null = null; 
  formulario: FormularioLugar = { ...FORMULARIO_VACIO };

  toastMensaje = '';
  mostrarToast = false;

  constructor(
    private adminService: Admin,
    private lugaresService: Lugares,
    private categoriasService: Categorias,
    private comunasService: Comunas,
    private authService: Auth,
    private router: Router
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
    if (segmento !== 'lugares' && segmento !== 'reportes') return;
    this.segmentoActivo = segmento;

    this.cargando = true;
    try {
      if (segmento === 'lugares') {
        this.lugares = await this.lugaresService.listar({});
      } else {
        this.reportes = await this.adminService.listarReportes(true);
      }
    } finally {
      this.cargando = false;
    }
  }

  // CRUD de lugares


  abrirFormularioNuevo() {
    this.lugarEditandoId = null;
    this.formulario = { ...FORMULARIO_VACIO };
    this.mostrarFormulario = true;
  }

  abrirFormularioEditar(lugar: Lugar) {
    this.lugarEditandoId = lugar.id_lugar;
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

      this.mostrarFormulario = false;
      this.lugares = await this.lugaresService.listar({});
    } catch {
      this.mostrarAviso('No se pudo guardar el lugar. Intenta de nuevo.');
    } finally {
      this.guardando = false;
    }
  }

  async eliminarLugar(lugar: Lugar) {

    const confirmado = window.confirm(`¿Eliminar "${lugar.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      await this.adminService.eliminarLugar(lugar.id_lugar);
      this.lugares = this.lugares.filter((l) => l.id_lugar !== lugar.id_lugar);
      this.mostrarAviso('Lugar eliminado.');
    } catch {
      this.mostrarAviso('No se pudo eliminar el lugar.');
    }
  }

  // Reportes

  async resolverReporte(reporte: Reporte) {
    try {
      await this.adminService.resolverReporte(reporte.id_reporte);
      this.reportes = this.reportes.filter((r) => r.id_reporte !== reporte.id_reporte);
      this.mostrarAviso('Reporte marcado como resuelto.');
    } catch {
      this.mostrarAviso('No se pudo actualizar el reporte.');
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