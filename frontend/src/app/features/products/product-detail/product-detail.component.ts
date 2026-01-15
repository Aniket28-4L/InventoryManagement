import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProductsService } from '../../../core/services/products.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: any = null;
  stock: any[] = [];
  warehouses: any[] = [];
  loading = true;
  stockLoading = false;
  showAddStockModal = false;
  showAdjustStockModal = false;
  selectedStock: any = null;
  stockForm = { warehouseId: '', qty: '', locationId: '', variantValue: '' };
  generatingPdf = false;
  @ViewChild('printContainer', { static: false }) printContainer?: ElementRef<HTMLDivElement>;
  showBarcodeModal = false;
  selectedVariantValue = '';
  printBarcodeValue = '';
  variantLabels: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService,
    private warehouseService: WarehouseService,
    private authService: AuthService,
    private api: ApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    }
  }

  async loadProduct(id: string): Promise<void> {
    const token = this.authService.token;
    if (!token) return;
    try {
      this.loading = true;
      const [productRes, stockRes, warehousesRes] = await Promise.all([
        this.productsService.get(id).toPromise(),
        this.productsService.stock(id).toPromise().catch(() => []),
        this.warehouseService.list({ page: 1, limit: 1000 }).toPromise()
      ]);
      this.product = productRes;
      this.stock = stockRes || [];
      this.warehouses = warehousesRes?.warehouses || [];
      
      // Auto-generate PDF if it doesn't exist (happens in backend, but ensure it's triggered)
      // The backend getProduct endpoint already handles this
    } catch (error: any) {
      this.toastr.error(error?.message || 'Failed to load product');
    } finally {
      this.loading = false;
    }
  }
  
  getQrCodeValue(): string {
    if (!this.product) return '';
    const origin = window.location.origin;
    const payload = String(this.printBarcodeValue || this.product.barcode || this.product.sku || '').trim();
    return payload ? `${origin}/stock/transfer?sku=${encodeURIComponent(payload)}` : `${origin}/stock/transfer`;
  }

  async refreshStock(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const token = this.authService.token;
    if (!token) return;
    try {
      this.stockLoading = true;
      const stockRes = await this.productsService.stock(id).toPromise();
      this.stock = stockRes || [];
    } catch (error) {
      console.error('Failed to refresh stock:', error);
    } finally {
      this.stockLoading = false;
    }
  }

  async handleAddStock(e: Event): Promise<void> {
    e.preventDefault();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.stockForm.warehouseId || !this.stockForm.qty) {
      this.toastr.error('Please fill in warehouse and quantity');
      return;
    }
    if (!this.stockForm.variantValue) {
      const values = this.variantValues();
      if (values.length > 0) {
        this.toastr.error('Please select a variant value');
        return;
      }
    }
    const token = this.authService.token;
    if (!token) return;
    try {
      const qtyNum = parseFloat(this.stockForm.qty);
      const v = this.stockForm.variantValue || '';
      if (v) {
        const variantQty = this.variantQuantity(v);
        const allocated = this.allocatedForVariant(v);
        const remaining = Math.max(0, variantQty - allocated);
        if (qtyNum > remaining) {
          this.toastr.error(`Quantity exceeds variant stock. Remaining for ${v}: ${remaining}`);
          return;
        }
      }
      await this.warehouseService.addStock({
        productId: id,
        warehouseId: this.stockForm.warehouseId,
        qty: qtyNum,
        locationId: this.stockForm.locationId || null,
        variantValue: this.stockForm.variantValue || ''
      }).toPromise();
      this.toastr.success('Stock added successfully');
      this.showAddStockModal = false;
      this.stockForm = { warehouseId: '', qty: '', locationId: '', variantValue: '' };
      await this.refreshStock();
    } catch (error: any) {
      this.toastr.error(error?.message || 'Failed to add stock');
    }
  }

  async handleAdjustStock(e: Event): Promise<void> {
    e.preventDefault();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.selectedStock || !this.stockForm.qty) {
      this.toastr.error('Please enter quantity');
      return;
    }
    const token = this.authService.token;
    if (!token) return;
    try {
      const target = parseFloat(this.stockForm.qty);
      const v = this.stockForm.variantValue || this.selectedStock?.variantValue || '';
      if (v) {
        const variantQty = this.variantQuantity(v);
        const totalAllocated = this.allocatedForVariant(v);
        const current = Number(this.selectedStock?.qty || 0);
        const otherAllocated = totalAllocated - current;
        const remaining = Math.max(0, variantQty - otherAllocated);
        if (target > remaining) {
          this.toastr.error(`Quantity exceeds variant stock. Remaining for ${v}: ${remaining}`);
          return;
        }
      }
      await this.warehouseService.adjustStock({
        productId: id,
        warehouseId: this.selectedStock.warehouse?._id || this.selectedStock.warehouse,
        qty: target,
        locationId: this.stockForm.locationId || null,
        variantValue: this.stockForm.variantValue || this.selectedStock?.variantValue || ''
      }).toPromise();
      this.toastr.success('Stock adjusted successfully');
      this.showAdjustStockModal = false;
      this.selectedStock = null;
      this.stockForm = { warehouseId: '', qty: '', locationId: '', variantValue: '' };
      await this.refreshStock();
    } catch (error: any) {
      this.toastr.error(error?.message || 'Failed to adjust stock');
    }
  }

  openAdjustModal(stockItem: any): void {
    this.selectedStock = stockItem;
    this.stockForm = {
      warehouseId: stockItem.warehouse?._id || stockItem.warehouse,
      qty: stockItem.qty || 0,
      locationId: stockItem.location?._id || stockItem.location || '',
      variantValue: stockItem.variantValue || ''
    };
    this.showAdjustStockModal = true;
  }

  get totalStock(): number {
    const variants = Array.isArray(this.product?.variants) ? this.product.variants : [];
    if (variants.length > 0) {
      return variants.reduce((sum: number, v: any) => sum + (Number(v?.qty || 0)), 0);
    }
    // Fallback: if no variants defined, treat total as 0 (warehouse stock is informational only)
    return 0;
  }

  get totalAvailable(): number {
    // Available MUST NOT be derived from warehouse data; it equals total variant quantity
    return this.totalStock;
  }

  get hasZeroStock(): boolean {
    return this.totalStock === 0;
  }

  get hasLowStock(): boolean {
    return this.totalStock > 0 && this.totalAvailable === 0;
  }

  formatCurrency(value: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) return '-';
    return `KD ${num.toFixed(2)}`;
  }

  formatLocation(location: any): string {
    if (!location) return '-';
    const parts: string[] = [];
    if (location.zone) parts.push(location.zone);
    if (location.shelf) parts.push(location.shelf);
    if (location.bin) parts.push(location.bin);
    const result = parts.join('-');
    return result || location.locationCode || '-';
  }

  async generatePdf(): Promise<void> {
    if (!this.product?.id) return;
    this.generatingPdf = true;
    try {
      const token = this.authService.token;
      if (!token) {
        this.toastr.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${environment.apiUrl}/products/${this.product.id}/pdf/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-${this.product.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.toastr.success('PDF generated and downloaded successfully');
        
        // Reload product to get updated PDF URL
        await this.loadProduct(this.product.id);
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to generate PDF' }));
        this.toastr.error(error.message || 'Failed to generate PDF');
      }
    } catch (error: any) {
      this.toastr.error(error?.message || 'Failed to generate PDF');
    } finally {
      this.generatingPdf = false;
    }
  }

  openBarcodeModal(): void {
    if (!this.product) return;
    const values = this.variantValues();
    this.selectedVariantValue = values[0] || (this.product.variantValue || '');
    this.showBarcodeModal = true;
  }

  variantValues(): string[] {
    const list = Array.isArray(this.product?.variants) ? this.product.variants : [];
    const values = list.map((e: any) => String(e?.value || '')).filter(Boolean);
    if (values.length === 0 && this.product?.variantValue) {
      values.push(String(this.product.variantValue));
    }
    return values;
  }

  deriveBarcodeValue(value: string): string {
    const list = Array.isArray(this.product?.variants) ? this.product.variants : [];
    const match = list.find((e: any) => String(e?.value || '') === String(value || ''));
    const base = match?.barcode || match?.sku || this.product?.barcode || this.product?.sku || '';
    if (!base) return '';
    // Prefer variant-specific barcode/sku; if base is product-level, append value
    const isProductLevel = base === this.product?.barcode || base === this.product?.sku;
    return isProductLevel ? `${base}-${value}` : base;
  }

  variantQuantity(value: string): number {
    const list = Array.isArray(this.product?.variants) ? this.product.variants : [];
    const match = list.find((e: any) => String(e?.value || '') === String(value || ''));
    return Number(match?.qty || 0);
  }

  allocatedForVariant(value: string): number {
    const list = Array.isArray(this.stock) ? this.stock : [];
    return list.filter((s: any) => String(s?.variantValue || '') === String(value || ''))
      .reduce((sum: number, s: any) => sum + Number(s?.qty || 0), 0);
  }

  confirmBarcodeSelection(): void {
    const v = String(this.selectedVariantValue || '').trim();
    this.printBarcodeValue = this.deriveBarcodeValue(v);
    this.showBarcodeModal = false;
    if (!this.printBarcodeValue) {
      this.toastr.warning('Unable to derive barcode for selected variant');
    } else {
      this.toastr.success('Barcode generated for selected variant');
    }
  }

  printLabel(): void {
    if (!this.product) {
      this.toastr.error('Product not loaded');
      return;
    }

    // Check if product has variants
    const variants = this.product.variants || [];
    
    if (variants.length > 0) {
      // For each variant, we'll generate 10 labels
      this.variantLabels = [];
      for (const variant of variants) {
        const barcodeValue = variant.barcode || variant.sku || `${this.product.barcode || this.product.sku}-${variant.value}`;
        for (let i = 0; i < 10; i++) {
          this.variantLabels.push({
            name: this.product.name,
            sku: this.product.sku,
            price: this.product.price,
            barcode: barcodeValue,
            variantValue: variant.value
          });
        }
      }
    } else {
      // If no variants, use the product-level barcode and generate 10 labels
      const valueToPrint = this.printBarcodeValue || this.product.barcode;
      if (!valueToPrint) {
        this.toastr.error('Product must have a barcode to print label');
        return;
      }
      
      this.variantLabels = [];
      for (let i = 0; i < 10; i++) {
        this.variantLabels.push({
          name: this.product.name,
          sku: this.product.sku,
          price: this.product.price,
          barcode: valueToPrint,
          variantValue: ''
        });
      }
    }

    // Mark print container as ready and wait briefly for barcode components to render
    try {
      if (this.printContainer?.nativeElement) {
        this.printContainer.nativeElement.classList.add('print-ready');
      }
      setTimeout(() => window.print(), 300);
    } finally {
      // Clean up the flag after printing
      setTimeout(() => {
        if (this.printContainer?.nativeElement) {
          this.printContainer.nativeElement.classList.remove('print-ready');
        }
      }, 1000);
    }
  }

  async eraseStock(item: any): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !item) return;
    try {
      await this.warehouseService.eraseStock({
        productId: id,
        warehouseId: item.warehouse?._id || item.warehouse,
        locationId: item.location?._id || item.location || null,
        variantValue: item.variantValue || ''
      }).toPromise();
      this.toastr.success('Stock entry erased');
      await this.refreshStock();
    } catch (error: any) {
      this.toastr.error(error?.message || 'Failed to erase stock entry');
    }
  }
}

