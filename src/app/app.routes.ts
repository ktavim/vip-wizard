import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard';
import { NotFound } from './pages/not-found';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: '**', component: NotFound },
];
