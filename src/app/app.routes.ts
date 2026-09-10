import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [

  // =========================
  // PUBLIC PAGES
  // =========================

  // Every user starts here
  {
    path: '',
    component: HomeComponent
  },

    // =========================
  // AUTHENTICATION
  // =========================

  {
    path: 'auth',
    children: [

      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component')
            .then(m => m.LoginComponent)
      },

      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component')
            .then(m => m.RegisterComponent)
      },

      // /auth → /auth/login
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },


  // =========================
  // PROTECTED APPLICATION
  // =========================

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],

    children: [

      // If an authenticated user enters the
      // application root, show Home instead
      {
        path: 'home',
        component: HomeComponent
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },

      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects.component')
            .then(m => m.ProjectsComponent)
      },

      {
        path: 'upload',
        loadComponent: () =>
          import('./features/upload/upload.component')
            .then(m => m.UploadComponent)
      },

      {
        path: 'scans/:id',
        loadComponent: () =>
          import('./features/scans/scan-detail/scan-detail.component')
            .then(m => m.ScanDetailComponent)
      },

      {
        path: 'ai-suggestions',
        loadComponent: () =>
          import('./features/ai-suggestions/ai-suggestions.component')
            .then(m => m.AiSuggestionsComponent)
      },

      {
        path: 'ci-cd',
        loadComponent: () =>
          import('./features/ci-cd/ci-cd.component')
            .then(m => m.CiCdComponent)
      },

      {
        path: 'billing',
        loadComponent: () =>
          import('./features/billing/billing.component')
            .then(m => m.BillingComponent)
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component')
            .then(m => m.SettingsComponent)
      },

      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component')
            .then(m => m.ReportsComponent)
      }
    ]
  },


  // =========================
  // FALLBACK
  // =========================

  // Any invalid URL → Home
  {
    path: '**',
    redirectTo: ''
  }
];