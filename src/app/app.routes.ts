import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'tabs/inicio', pathMatch: 'full' },

  // Auth
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () => import('./features/auth/registro/registro.component').then((m) => m.RegistroComponent),
  },
  {
    path: 'auth/recuperar',
    loadComponent: () =>
      import('./features/auth/recuperar-password/recuperar-password.component').then(
        (m) => m.RecuperarPasswordComponent
      ),
  },
  {
    path: 'auth/restablecer',
    loadComponent: () =>
      import('./features/auth/restablecer-password/restablecer-password.component').then(
        (m) => m.RestablecerPasswordComponent
      ),
  },

  // Tabs principales (Inicio / Mapa / Perfil)
  {
    path: 'tabs',
    loadComponent: () => import('./shared/components/tabs/tabs.component').then((m) => m.TabsComponent),
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/inicio/pagina-inicio/pagina-inicio.component').then((m) => m.PaginaInicioComponent),
      },
      {
        path: 'mapa',
        loadComponent: () =>
          import('./features/mapa/pagina-mapa/pagina-mapa.component').then((m) => m.PaginaMapaComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/pagina-perfil/pagina-perfil.component').then((m) => m.PaginaPerfilComponent),
        canActivate: [authGuard],
      },
    ],
  },

  // Catálogo completo
  {
    path: 'lugares',
    loadComponent: () =>
      import('./features/catalogo/lista-lugares/lista-lugares.component').then((m) => m.ListaLugaresComponent),
  },
  {
    path: 'lugares/:id',
    loadComponent: () =>
      import('./features/catalogo/detalle-lugar/detalle-lugar.component').then((m) => m.DetalleLugarComponent),
  },

  //  Historial/medallas (accesible desde Perfil)
  {
    path: 'perfil/historial',
    loadComponent: () =>
      import('./features/gamificacion/medallas/medallas.component').then((m) => m.MedallasComponent),
    canActivate: [authGuard],
  },

  // Personalización de avatar (accesible desde Perfil)
  {
    path: 'perfil/personalizar-avatar',
    loadComponent: () =>
      import('./features/perfil/personalizar-avatar/personalizar-avatar.component').then(
        (m) => m.PersonalizarAvatarComponent
      ),
    canActivate: [authGuard],
  },

  // Admin
  {
    path: 'admin/login-admin',
    loadComponent: () =>
      import('./features/admin/login-admin/login-admin.component').then((m) => m.LoginAdminComponent),
  },
  {
    path: 'admin/gestion-lugares',
    loadComponent: () =>
      import('./features/admin/gestion-lugares/gestion-lugares.component').then((m) => m.GestionLugaresComponent),
    canActivate: [adminGuard],
  },

  { path: '**', redirectTo: 'tabs/inicio' },
];