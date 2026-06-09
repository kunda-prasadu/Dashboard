import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'policies',
    pathMatch: 'full'
  },
  {
    path: 'policies',
    loadComponent: () =>
      import('./features/policy-dashboard/pages/policy-overview/policy-overview.page').then(
        m => m.PolicyOverviewPage
      )
  }
];
