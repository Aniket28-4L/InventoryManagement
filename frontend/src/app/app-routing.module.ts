import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { ProductsListComponent } from './features/products/products-list/products-list.component';
import { ProductFormComponent } from './features/products/product-form/product-form.component';
import { ProductDetailComponent } from './features/products/product-detail/product-detail.component';
import { ProductImportComponent } from './features/products/product-import/product-import.component';
import { CatalogManagerComponent } from './features/catalog/catalog-manager/catalog-manager.component';
import { SuppliersListComponent } from './features/suppliers/suppliers-list/suppliers-list.component';
import { SupplierFormComponent } from './features/suppliers/supplier-form/supplier-form.component';
import { BarcodeGenerateComponent } from './features/barcodes/barcode-generate/barcode-generate.component';
import { BarcodePrintComponent } from './features/barcodes/barcode-print/barcode-print.component';
import { BarcodeScanComponent } from './features/barcodes/barcode-scan/barcode-scan.component';
import { WarehousesListComponent } from './features/warehouse/warehouses-list/warehouses-list.component';
import { WarehouseFormComponent } from './features/warehouse/warehouse-form/warehouse-form.component';
import { LocationsComponent } from './features/warehouse/locations/locations.component';
import { StockTransferComponent } from './features/warehouse/stock-transfer/stock-transfer.component';
import { StockLogsComponent } from './features/warehouse/stock-logs/stock-logs.component';
import { UsersListComponent } from './features/users/users-list/users-list.component';
import { UserFormComponent } from './features/users/user-form/user-form.component';
import { ReportTableComponent } from './features/reports/report-table/report-table.component';
import { ReportsActivityComponent } from './features/reports/reports-activity/reports-activity.component';
import { SalesPageComponent } from './features/sales/sales-page/sales-page.component';
import { SalesHistoryComponent } from './features/sales/sales-history/sales-history.component';
import { InvoiceViewComponent } from './features/sales/invoice-view/invoice-view.component';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardPageComponent, pathMatch: 'full' },
      { path: 'products', component: ProductsListComponent },
      { path: 'products/new', component: ProductFormComponent },
      { path: 'products/import', component: ProductImportComponent },
      { path: 'products/:id/edit', component: ProductFormComponent },
      { path: 'products/:id', component: ProductDetailComponent },
      { path: 'categories', component: CatalogManagerComponent, data: { type: 'category' } },
      { path: 'variants', component: CatalogManagerComponent, data: { type: 'variant' } },
      { path: 'stores', component: CatalogManagerComponent, data: { type: 'store' } },
      { path: 'brands', component: CatalogManagerComponent, data: { type: 'brand' } },
      { path: 'suppliers', component: SuppliersListComponent },
      { path: 'suppliers/new', component: SupplierFormComponent },
      { path: 'suppliers/:id/edit', component: SupplierFormComponent },
      { path: 'barcodes/generate', component: BarcodeGenerateComponent },
      { path: 'barcodes/print', component: BarcodePrintComponent },
      { path: 'barcodes/scan', component: BarcodeScanComponent },
      { path: 'warehouses', component: WarehousesListComponent },
      { path: 'warehouses/new', component: WarehouseFormComponent },
      { path: 'warehouses/:id/edit', component: WarehouseFormComponent },
      { path: 'warehouses/:id', component: WarehouseFormComponent },
      { path: 'locations', component: LocationsComponent },
      { path: 'stock/transfer', component: StockTransferComponent },
      { path: 'stock/logs', component: StockLogsComponent },
      { path: 'users', component: UsersListComponent },
      { path: 'users/new', component: UserFormComponent },
      { path: 'users/:id', component: UserFormComponent },
      { path: 'reports/stock', component: ReportTableComponent, data: { type: 'stock' } },
      { path: 'reports/warehouse', component: ReportTableComponent, data: { type: 'warehouse' } },
      { path: 'reports/movement', component: ReportTableComponent, data: { type: 'movement' } },
      { path: 'reports/low-stock', component: ReportTableComponent, data: { type: 'lowStock' } },
      { path: 'reports/activity', component: ReportsActivityComponent },
      { path: 'sales', component: SalesPageComponent },
      { path: 'sales/history', component: SalesHistoryComponent },
      { path: 'sales/:id', component: InvoiceViewComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}


