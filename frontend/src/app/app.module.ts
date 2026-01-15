import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';

import { SpinnerComponent } from './shared/components/spinner/spinner.component';
import { ModalComponent } from './shared/components/modal/modal.component';
import { FileUploaderComponent } from './shared/components/file-uploader/file-uploader.component';
import { StatCardComponent } from './shared/components/stat-card/stat-card.component';
import { DataTableComponent } from './shared/components/data-table/data-table.component';
import { DataTableCellDirective } from './shared/components/data-table/data-table-cell.directive';
import { BarcodePreviewComponent } from './shared/components/barcode-preview/barcode-preview.component';
import { PdfPreviewModalComponent } from './shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { LucideIconComponent } from './shared/components/lucide-icon/lucide-icon.component';

import { LoginPageComponent } from './features/auth/login-page/login-page.component';
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

import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    DashboardLayoutComponent,
    SidebarComponent,
    TopbarComponent,
    SpinnerComponent,
    ModalComponent,
    FileUploaderComponent,
    StatCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    BarcodePreviewComponent,
    PdfPreviewModalComponent,
    LucideIconComponent,
    LoginPageComponent,
    DashboardPageComponent,
    ProductsListComponent,
    ProductFormComponent,
    ProductDetailComponent,
    ProductImportComponent,
    CatalogManagerComponent,
    SuppliersListComponent,
    SupplierFormComponent,
    BarcodeGenerateComponent,
    BarcodePrintComponent,
    BarcodeScanComponent,
    WarehousesListComponent,
    WarehouseFormComponent,
    LocationsComponent,
    StockTransferComponent,
    StockLogsComponent,
    UsersListComponent,
    UserFormComponent,
    ReportTableComponent,
    ReportsActivityComponent
    ,SalesPageComponent
    ,SalesHistoryComponent
    ,InvoiceViewComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    ToastrModule.forRoot({ positionClass: 'toast-top-right' })
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, multi: true, useClass: AuthInterceptor }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}


