import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  ribbonOutline,
  colorPaletteOutline,
  ticketOutline,
  leafOutline,
  trailSignOutline,
  businessOutline,
  flameOutline,
  bookOutline,
  filmOutline,
  imagesOutline,
} from 'ionicons/icons';

import { Auth } from 'src/app/core/services/auth';
import { Gamificacion } from 'src/app/core/services/gamificacion';
import { Categorias } from 'src/app/core/services/categorias';
import { Lugar, Medalla, UsuarioMedalla } from 'src/app/core/models';
import { ColorTema, obtenerColorCategoria, obtenerIconoCategoria } from 'src/app/core/utils/tema-categoria';

type Segmento = 'lugares' | 'medallas' | 'categorias';
type MedallaObtenida = UsuarioMedalla & { medalla: Medalla };

interface LugarVisitado {
  lugar: Lugar;
  fecha_visita: string;
}

interface ProgresoMedalla {
  medalla: Medalla;
  obtenida: boolean;
  fechaObtencion: string | null;
  actual: number;
  requerido: number;
  icono: string;
  color: ColorTema;
}

interface ConteoCategoria {
  id_categoria: string;
  nombre: string;
  cantidad: number;
}

@Component({
  selector: 'app-medallas',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonSkeletonText,
  ],
  templateUrl: './medallas.component.html',
  styleUrls: ['./medallas.component.scss'],
})
export class MedallasComponent implements OnInit {
  segmentoActivo: Segmento = 'lugares';
  cargando = true;

  lugaresVisitados: LugarVisitado[] = [];
  progresoMedallas: ProgresoMedalla[] = [];
  categoriasConteo: ConteoCategoria[] = [];

  constructor(
    private authService: Auth,
    private gamificacionService: Gamificacion,
    private categoriasService: Categorias,
    private router: Router
  ) {
    addIcons({
      ribbonOutline,
      colorPaletteOutline,
      ticketOutline,
      leafOutline,
      trailSignOutline,
      businessOutline,
      flameOutline,
      bookOutline,
      filmOutline,
      imagesOutline,
    });
  }

  async ngOnInit() {
    this.cargando = true;
    try {
      const usuario = await this.authService.obtenerUsuarioActual();
      if (!usuario) return;

      const [lugaresVisitados, medallasGanadas, medallasTodas, conteoPorCategoria, totalVisitas, categorias] =
        await Promise.all([
          this.gamificacionService.listarLugaresVisitados(usuario.id_usuario),
          this.gamificacionService.listarMedallasDeUsuario(usuario.id_usuario) as Promise<MedallaObtenida[]>,
          this.gamificacionService.listarTodasLasMedallas(),
          this.gamificacionService.contarVisitasPorCategoria(usuario.id_usuario),
          this.gamificacionService.contarVisitasTotales(usuario.id_usuario),
          this.categoriasService.listar(),
        ]);

      this.lugaresVisitados = lugaresVisitados;

      // id_categoria -> nombre, para poder resolver el ícono/color de cada
      // medalla.
      const nombrePorIdCategoria = new Map<string, string>(
        (categorias as any[]).map((c) => [c.id_categoria, c.nombre])
      );

      // Progreso de cada medalla, ganada o no. Si medalla.id_categoria es
      // null, el requisito es sobre el total de visitas
      const idsGanadas = new Map(medallasGanadas.map((m) => [m.id_medalla, m.fecha_obtencion]));
      this.progresoMedallas = medallasTodas
        .map((medalla) => {
          const actualSinTope = medalla.id_categoria
            ? conteoPorCategoria[medalla.id_categoria] ?? 0
            : totalVisitas;
          const nombreCategoria = medalla.id_categoria
            ? nombrePorIdCategoria.get(medalla.id_categoria)
            : null;
          return {
            medalla,
            obtenida: idsGanadas.has(medalla.id_medalla),
            fechaObtencion: idsGanadas.get(medalla.id_medalla) ?? null,
            actual: Math.min(actualSinTope, medalla.cantidad_requerida),
            requerido: medalla.cantidad_requerida,
            icono: obtenerIconoCategoria(nombreCategoria),
            color: obtenerColorCategoria(nombreCategoria, medalla.id_categoria),
          };
        })
        .sort((a, b) => {
          const aGeneral = a.medalla.id_categoria == null;
          const bGeneral = b.medalla.id_categoria == null;
          if (aGeneral !== bGeneral) return aGeneral ? -1 : 1;

          if (a.obtenida !== b.obtenida) return a.obtenida ? -1 : 1;
          return b.actual / b.requerido - a.actual / a.requerido;
        });

      this.categoriasConteo = (categorias as any[])
        .map((categoria) => ({
          id_categoria: categoria.id_categoria,
          nombre: categoria.nombre,
          cantidad: conteoPorCategoria[categoria.id_categoria] ?? 0,
        }))
        .filter((c) => c.cantidad > 0)
        .sort((a, b) => b.cantidad - a.cantidad);
    } finally {
      this.cargando = false;
    }
  }

  cambiarSegmento(segmento: string | number | undefined) {
    if (segmento === 'lugares' || segmento === 'medallas' || segmento === 'categorias') {
      this.segmentoActivo = segmento;
    }
  }

  irADetalle(lugar: Lugar) {
    this.router.navigate(['/lugares', lugar.id_lugar]);
  }
}