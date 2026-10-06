import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
export class PaginaInicioComponent implements OnInit {
  nombreUsuario = '';
  terminoBusqueda = '';
  filtroActivo: FiltroRapido = 'todos';

  lugaresRecomendados: Lugar[] = [];
  cargando = true;

  // LIMITE DE CUANTOS LUGARES MOSTRAR
  private readonly LIMITE_RECOMENDADOS = 4;

  constructor(
    private auth: Auth,
    private lugares: Lugares,
    private router: Router
  ) {
    addIcons({ mapOutline, sparklesOutline, locationOutline });
  }

  async ngOnInit() {
    await this.cargarRecomendados();
  }

  private async cargarUsuario() {
    const usuario = await this.auth.obtenerUsuarioActual();
    this.nombreUsuario = usuario?.nombre?.split(' ')[0] ?? '';
  }

  private async cargarRecomendados() {
    this.cargando = true;
    try {
      const filtros = this.filtroActivo === 'gratis' ? { soloGratuitos: true } : {};
      const resultado = await this.lugares.listar(filtros);
      this.lugaresRecomendados = resultado.slice(0, this.LIMITE_RECOMENDADOS);
    } finally {
      this.cargando = false;
    }
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

    await this.cargarRecomendados();
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
    await this.cargarUsuario();
  }
}