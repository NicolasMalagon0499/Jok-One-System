import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: 'barber/home',
    loadComponent: () => import('./pages/barber/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'barber-detail',
    loadComponent: () => import('./pages/admin/barber-detail/barber-detail.page').then( m => m.BarberDetailPage)
  },

  {
  path: 'admin/barber-detail/:barberId/:barberName',
  loadComponent: () => import('./pages/admin/barber-detail/barber-detail.page').then(m => m.BarberDetailPage)
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/admin/inventory/inventory.page').then( m => m.InventoryPage)
  },

  {
  path: 'admin/inventory',
  loadComponent: () => import('./pages/admin/inventory/inventory.page').then(m => m.InventoryPage)
  },
  {
    path: 'expenses',
    loadComponent: () => import('./pages/admin/expenses/expenses.page').then( m => m.ExpensesPage)
  },
  
  {
  path: 'admin/expenses',
  loadComponent: () => import('./pages/admin/expenses/expenses.page').then(m => m.ExpensesPage)
  }

];