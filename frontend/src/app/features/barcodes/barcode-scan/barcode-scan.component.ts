import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../core/services/api.service';
import { ProductsService } from '../../../core/services/products.service';
import { environment } from '../../../../environments/environment';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { StockTransferService } from '../../../core/services/stock-transfer.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-barcode-scan',
  templateUrl: './barcode-scan.component.html',
  styleUrls: ['./barcode-scan.component.scss']
})
export class BarcodeScanComponent implements OnInit, OnDestroy {
  scannedBarcode = '';
  product: any = null;
  loading = false;
  isMobile = false;
  isRedirecting = false;
  private inputTimeout: any;
  private html5Qr?: Html5Qrcode;
  scanActive = false;
  scanSuccess = false;
  preventMultiple = false;
  availableCameras: any[] = [];
  cameraId = '';
  transferType: 'warehouse' | 'store' = 'warehouse';
  warehouses: any[] = [];
  stores: any[] = [];
  scannedUrl = '';
  fromWarehouseId = '';
  toWarehouseId = '';
  toStoreId = '';
  quantity = '';
  
  // Role-based action selection
  showActionModal = false;
  scannedProduct: any = null;

  constructor(
    private api: ApiService,
    private productsService: ProductsService,
    private router: Router,
    private toastr: ToastrService,
    private warehouseService: WarehouseService,
    private catalogService: CatalogService,
    private stockTransferService: StockTransferService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.prepareScanner();
    this.loadWarehousesAndStores();
  }

  ngOnDestroy(): void {
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
    }
    this.stopScanning();
  }

  onBarcodeInput(value: string): void {
    this.scannedBarcode = value;
    
    // Clear previous timeout
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
    }

    // Wait for user to finish typing (debounce)
    this.inputTimeout = setTimeout(() => {
      if (value && value.trim().length > 0) {
        this.scanBarcode(value.trim());
      }
    }, 500);
  }

  async prepareScanner(): Promise<void> {
    try {
      const cams = await Html5Qrcode.getCameras();
      this.availableCameras = cams || [];
      this.cameraId = this.availableCameras[0]?.id || '';
    } catch {}
  }

  async startScanning(): Promise<void> {
    if (this.scanActive) return;
    this.scanSuccess = false;
    this.preventMultiple = false;
    try {
      this.html5Qr = new Html5Qrcode('qr-reader', { verbose: false });
      const config: any = {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE],
        disableFlip: true
      };
      this.scanActive = true;
      await this.html5Qr.start(
        this.cameraId ? this.cameraId : { facingMode: 'environment' } as any,
        config,
        (decodedText: string) => {
          if (this.preventMultiple) return;
          this.preventMultiple = true;
          this.scanSuccess = true;
          this.scannedBarcode = decodedText;
          this.stopScanning();
          this.scanBarcode(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      this.scanActive = false;
      this.toastr.error(err?.message || 'Unable to start camera');
    }
  }

  async stopScanning(): Promise<void> {
    try {
      if (this.html5Qr && this.scanActive) {
        await this.html5Qr.stop();
        await this.html5Qr.clear();
      }
    } catch {}
    this.scanActive = false;
  }

  changeCamera(id: string): void {
    this.cameraId = id;
    if (this.scanActive) {
      this.stopScanning().then(() => this.startScanning());
    }
  }

  scanBarcode(barcode: string): void {
    if (!barcode) {
      this.toastr.error('Please enter or scan a barcode');
      return;
    }

    // If QR contains a URL, open it immediately (stock transfer flow)
    if (barcode.startsWith('http://') || barcode.startsWith('https://')) {
      window.location.href = barcode;
      return;
    }

    // Find the product first
    this.loading = true;
    this.findProductByCode(barcode).then((product) => {
      this.loading = false;
      
      if (!product) {
        this.toastr.error('No product found for this barcode');
        return;
      }
      
      this.scannedProduct = product;
      const userRole = (this.roleService.role || '').toLowerCase();
      
      console.log('User role detected:', userRole, 'Original:', this.roleService.role);
      
      // Staff and Sales role: Go directly to sales page
      if (userRole === 'staff' || userRole === 'sales') {
        this.goToSales();
        return;
      }
      
      // Admin/Manager: Show action choice modal
      if (userRole === 'admin' || userRole === 'manager') {
        console.log('Showing action modal for Admin/Manager');
        this.showActionModal = true;
        return;
      }
      
      // Store Keeper: Go directly to stock transfer
      if (userRole === 'store keeper') {
        this.goToStockTransfer();
        return;
      }
      
      // Default behavior for other roles (Viewer etc.): Just show product info
      this.product = product;
    }).catch((err) => {
      this.loading = false;
      console.error('Product lookup failed:', err);
      this.toastr.error('Failed to lookup product');
    });
  }
  
  // Handle action selection from modal
  selectAction(action: 'transfer' | 'sales'): void {
    this.showActionModal = false;
    
    if (action === 'transfer') {
      this.goToStockTransfer();
    } else {
      this.goToSales();
    }
  }
  
  closeActionModal(): void {
    this.showActionModal = false;
    this.scannedProduct = null;
    this.clearScan();
  }
  
  private goToStockTransfer(): void {
    if (this.scannedProduct) {
      // Navigate to stock transfer page with product info
      const queryParams: any = { 
        sku: this.scannedProduct.sku || this.scannedProduct.barcode || this.scannedBarcode 
      };
      
      // If a specific variant was matched, include it
      if (this.scannedProduct.matchedVariant) {
        queryParams.variant = this.scannedProduct.matchedVariant.value;
      }
      
      this.router.navigate(['/stock/transfer'], { queryParams });
    }
  }
  
  private goToSales(): void {
    if (this.scannedProduct) {
      // Navigate to sales page with product info
      const queryParams: any = { 
        productId: this.scannedProduct.id || this.scannedProduct._id,
        sku: this.scannedProduct.sku || '',
        barcode: this.scannedProduct.barcode || this.scannedBarcode
      };
      
      // If a specific variant was matched, include it
      if (this.scannedProduct.matchedVariant) {
        queryParams.variant = this.scannedProduct.matchedVariant.value;
      }
      
      this.router.navigate(['/sales'], { queryParams });
    }
  }

  redirectToProductPdf(productId: string): void {
    // Fallback to product detail page
    this.router.navigate(['/products', productId]);
  }

  openPdf(): void {
    if (this.product?.pdfUrl) {
      const apiBaseUrl = environment.apiUrl.replace('/api', ''); // Remove /api since pdfUrl already includes it
      const pdfUrl = this.product.pdfUrl.startsWith('http') 
        ? this.product.pdfUrl 
        : `${apiBaseUrl}${this.product.pdfUrl}`;
      window.open(pdfUrl, '_blank');
    }
  }

  viewProductDetails(): void {
    if (this.product?.id) {
      this.router.navigate(['/products', this.product.id]);
    }
  }

  clearScan(): void {
    this.scannedBarcode = '';
    this.product = null;
    this.scanSuccess = false;
    this.scannedUrl = '';
    this.fromWarehouseId = '';
    this.toWarehouseId = '';
    this.toStoreId = '';
    this.quantity = '';
    this.transferType = 'warehouse';
  }

  confirmTransfer(): void {
    if (!this.product?.id) {
      this.toastr.error('No product selected');
      return;
    }
    const qtyNum = parseInt(String(this.quantity), 10);
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      this.toastr.error('Enter a valid quantity');
      return;
    }
    if (!this.fromWarehouseId) {
      this.toastr.error('Select source warehouse');
      return;
    }
    if (this.transferType === 'store') {
      if (!this.toStoreId) {
        this.toastr.error('Select destination store');
        return;
      }
      const payload = {
        productId: this.product.id,
        fromWarehouse: this.fromWarehouseId,
        storeId: this.toStoreId,
        qty: qtyNum
      };
      this.warehouseService.transferToStore(payload).subscribe({
        next: () => {
          this.toastr.success('Transferred to store');
          this.clearScan();
        },
        error: (error: any) => {
          const backendMsg = error?.error?.message || error?.error?.errors?.[0]?.msg;
          this.toastr.error(backendMsg || error?.message || 'Transfer failed');
        }
      });
    } else {
      if (!this.toWarehouseId) {
        this.toastr.error('Select destination warehouse');
        return;
      }
      if (this.toWarehouseId === this.fromWarehouseId) {
        this.toastr.error('Source and destination cannot be same');
        return;
      }
      const payload = {
        fromWarehouse: this.fromWarehouseId,
        toWarehouse: this.toWarehouseId,
        items: [{
          product: this.product.id,
          sku: this.product.sku || '',
          quantity: qtyNum,
          notes: ''
        }],
        notes: ''
      };
      this.stockTransferService.create(payload).subscribe({
        next: () => {
          this.toastr.success('Transferred to warehouse');
          this.clearScan();
        },
        error: (error: any) => {
          const backendMsg = error?.error?.message || error?.error?.errors?.[0]?.msg;
          this.toastr.error(backendMsg || error?.message || 'Transfer failed');
        }
      });
    }
  }

  private loadWarehousesAndStores(): void {
    this.warehouseService.list({ limit: 1000 }).subscribe({
      next: (res) => { this.warehouses = res.warehouses || []; },
      error: () => {}
    });
    this.catalogService.listStores().subscribe({
      next: (stores) => { this.stores = stores || []; },
      error: () => {}
    });
  }

  private async findProductByCode(code: string): Promise<any | null> {
    try {
      const res = await this.api.get<{ success: boolean; data: any }>(`/barcodes/scan?barcode=${encodeURIComponent(code)}`).toPromise();
      if (res?.success && res?.data) return res.data;
    } catch {}
    if (code.includes('-')) {
      const base = code.split('-')[0];
      try {
        const res = await this.api.get<{ success: boolean; data: any }>(`/barcodes/scan?barcode=${encodeURIComponent(base)}`).toPromise();
        if (res?.success && res?.data) return res.data;
      } catch {}
    }
    try {
      const m = code.match(/\/products\/([a-f0-9]{24})/i);
      if (m && m[1]) {
        const prod = await this.productsService.get(m[1]).toPromise();
        if (prod) return prod;
      }
    } catch {}
    try {
      const listing = await this.productsService.list({ page: 1, limit: 1000 }).toPromise();
      const items = listing?.products || [];
      const match = items.find((p: any) => String(p.barcode || '').trim() === code || String(p.sku || '').trim() === code);
      if (match) return await this.productsService.get(match.id).toPromise();
    } catch {}
    return null;
  }

}
