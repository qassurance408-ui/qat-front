import { Routes } from '@angular/router';
import { authGuard } from './services/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => import('./workspace-page').then(m => m.WorkspacePage),
  },
  {
    path: 'account-settings',
    canActivate: [authGuard],
    loadComponent: () => import('./components/account-settings/account-settings').then(m => m.AccountSettingsPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
