import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonContent,
  IonSearchbar,
  IonChip,
  IonIcon,
  IonLabel,
  IonButton,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, sparklesOutline, locationOutline } from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { Lugares } from 'src/app/core/services/lugares';
import { Lugar } from 'src/app/core/models';

type FiltroRapido = 'todos' | 'gratis' | 'cerca';
type LugarConDestacado = Lugar & { destacado?: boolean };

@Component({
  selector: 'app-pagina-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonChip,
    IonIcon,
    IonLabel,
    IonButton,
    IonSkeletonText,
  ],
  templateUrl: './pagina-inicio.component.html',
  styleUrls: ['./pagina-inicio.component.scss'],
})
export class PaginaInicioComponent implements OnInit, OnDestroy {
  nombreUsuario = '';
  terminoBusqueda = '';
  filtroActivo: FiltroRapido = 'todos';

  lugaresDestacados: Lugar[] = [];
  // Resultado completo de la última carga: de aquí se vuelven a sortear los 4 que se muestran.
  private catalogoCargado: LugarConDestacado[] = [];
  private suscripcionSesion?: Subscription;
  private suscripcionCambios?: Subscription;
  cargando = true;

  // LIMITE DE CUANTOS LUGARES MOSTRAR
  private readonly LIMITE_DESTACADOS = 4;

  constructor(
    private auth: Auth,
    private lugares: Lugares,
    private router: Router
  ) {
    addIcons({ mapOutline, sparklesOutline, locationOutline });
  }

  async ngOnInit() {
    this.suscripcionSesion = this.auth.cambioSesion$.subscribe(() => this.cargarUsuario());
    // La pestaña queda en memoria: si el administrador cambia el catálogo, se recargan los destacados.
    this.suscripcionCambios = this.lugares.cambios$.subscribe(() => this.cargarDestacados());
    await this.cargarDestacados();
  }

  ngOnDestroy() {
    this.suscripcionSesion?.unsubscribe();
    this.suscripcionCambios?.unsubscribe();
  }

  private async cargarUsuario() {
    const usuario = await this.auth.obtenerUsuarioActual();
    this.nombreUsuario = usuario?.nombre?.split(' ')[0] ?? '';
  }

  private async cargarDestacados() {
    this.cargando = true;
    try {
      const filtros = this.filtroActivo === 'gratis' ? { soloGratuitos: true } : {};
      this.catalogoCargado = (await this.lugares.listar(filtros)) as LugarConDestacado[];
      this.elegirDestacados();
    } finally {
      this.cargando = false;
    }
  }

  private elegirDestacados() {
    const marcados = this.catalogoCargado.filter((lugar) => lugar.destacado);
    const resto = this.catalogoCargado.filter((lugar) => !lugar.destacado);

    const elegidos = this.barajar(marcados).slice(0, this.LIMITE_DESTACADOS);
    if (elegidos.length < this.LIMITE_DESTACADOS) {
      elegidos.push(...resto.slice(0, this.LIMITE_DESTACADOS - elegidos.length));
    }
    this.lugaresDestacados = elegidos;
  }

  /** Copia mezclada al azar. */
  private barajar<T>(lista: T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  async onFiltroSeleccionado(filtro: FiltroRapido) {
    this.filtroActivo = filtro;

    if (filtro === 'cerca') {
      // Desde Inicio solo se redirige al mapa por técnica de "cerca de mí".
      // 'true' como string explícito (no booleano): más seguro para cómo
      // Angular Router serializa queryParams en la URL.
      this.router.navigate(['/tabs/mapa'], { queryParams: { cerca: 'true' } });
      return;
    }

    await this.cargarDestacados();
  }

  onBuscar() {
    if (!this.terminoBusqueda.trim()) {
      return;
    }
    this.router.navigate(['/lugares'], {
      queryParams: { q: this.terminoBusqueda.trim() },
    });
  }

  irADetalle(lugar: Lugar) {
    this.router.navigate(['/lugares', lugar.id_lugar]);
  }

  trackPorId(_indice: number, lugar: Lugar): string {
    return lugar.id_lugar;
  }

  irAVerMapa() {
    this.router.navigate(['/tabs/mapa']);
  }

  irAVerTodos() {
    this.router.navigate(['/lugares']);
  }

  saludo = 'Hola';
  fraseDelDia = '';

  private readonly FRASES = [
  'Santiago tiene mucho por mostrarte',
  'Hoy es buen día para un museo',
  '¿Un parque nuevo esta semana?',
  'Descubre algo distinto cerca de ti',
  '¿Y si hoy sales a explorar?',
  'Hay panoramas gratis esperándote',
  '¿Ya conoces todos los cerros de Santiago?',
  'Tu próxima aventura está cerca',
  'Explora, descubre y vuelve por más',
  'Santiago se disfruta caminando',
  'Encuentra un rincón nuevo hoy',
  '¿Museo, parque o teatro? Tú eliges',
  ];

  private actualizarSaludo() {
  const hora = new Date().getHours();
  this.saludo =
    hora < 12 ? 'Buenos días' :
    hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  let nueva: string;
  do {
    nueva = this.FRASES[Math.floor(Math.random() * this.FRASES.length)];
  } while (nueva === this.fraseDelDia && this.FRASES.length > 1);
  this.fraseDelDia = nueva;
  }

  async ionViewWillEnter() {
    this.actualizarSaludo();
    // Cada vez que se vuelve a Inicio se sortean de nuevo (sin volver a pedir datos a la base).
    if (this.catalogoCargado.length) this.elegirDestacados();
    await this.cargarUsuario();
  }
}