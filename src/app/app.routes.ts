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
    loadComponent: () =>
      import('./features/auth/auth-shell/auth-shell.component')
        .then(m => m.AuthShellComponent),
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
        path: 'scans/new',
        loadComponent: () =>
          import('./features/upload/upload.component')
            .then(m => m.UploadComponent)
      },

      {
        path: 'history',
        loadComponent: () =>
          import('./features/scans/history/scan-history.component')
            .then(m => m.ScanHistoryComponent)
      },

      {
        path: 'vulnerabilities',
        loadComponent: () =>
          import('./features/vulnerabilities/vulnerabilities.component')
            .then(m => m.VulnerabilitiesComponent)
      },

      {
        path: 'quality',
        loadComponent: () =>
          import('./features/vulnerabilities/vulnerabilities.component')
            .then(m => m.VulnerabilitiesComponent)
      },

      {
        path: 'remediation',
        loadComponent: () =>
          import('./features/vulnerabilities/vulnerabilities.component')
            .then(m => m.VulnerabilitiesComponent)
      },

      {
        path: 'architecture',
        loadComponent: () =>
          import('./features/architecture/architecture-explorer.component')
            .then(m => m.ArchitectureExplorerComponent)
      },

      {
        path: 'threats',
        loadComponent: () =>
          import('./features/architecture/architecture-explorer.component')
            .then(m => m.ArchitectureExplorerComponent),
        data: { mode: 'threats' }
      },

      {
        path: 'integrations',
        loadComponent: () =>
          import('./features/integrations/integrations.component')
            .then(m => m.IntegrationsComponent)
      },

      {
        path: 'assistant',
        loadComponent: () =>
          import('./features/assistant/assistant.component')
            .then(m => m.AssistantComponent)
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

      { path: 'ci-cd', redirectTo: 'integrations', pathMatch: 'full' },

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