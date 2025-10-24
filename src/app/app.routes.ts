import { Routes } from '@angular/router';
import { AgGridTable } from './ag-grid-table/ag-grid-table';

export const routes: Routes = [
  { path: '', redirectTo: 'table', pathMatch: 'full' },
  { path: 'table', component: AgGridTable },
];
