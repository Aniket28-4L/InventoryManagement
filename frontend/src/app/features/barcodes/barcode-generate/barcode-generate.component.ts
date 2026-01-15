import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProductsService } from '../../../core/services/products.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-barcode-generate',
  templateUrl: './barcode-generate.component.html',
  styleUrls: ['./barcode-generate.component.scss']
})
export class BarcodeGenerateComponent implements OnInit {
  products: any[] = [];
  selectedProduct: any = null;
  barcodeType = 'code128';
  barcodeValue = '';
  loading = false;
  generatedBarcode: string = '';
  selectedVariantValue = '';

  constructor(
    private productsService: ProductsService,
    private api: ApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.list({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.products = res.products;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load products');
        this.loading = false;
      }
    });
  }

  onProductSelect(): void {
    if (this.selectedProduct) {
      // Use product's barcode value, fallback to SKU
      this.barcodeValue = this.selectedProduct.barcode || this.selectedProduct.sku || '';
      // If product doesn't have PDF URL, fetch full product details
      if (!this.selectedProduct.pdfUrl) {
        this.productsService.get(this.selectedProduct.id).subscribe({
          next: (product) => {
            this.selectedProduct = product;
            const values = this.variantValues();
            this.selectedVariantValue = values[0] || (this.selectedProduct.variantValue || '');
            this.generateBarcode();
          },
          error: () => {
            const values = this.variantValues();
            this.selectedVariantValue = values[0] || (this.selectedProduct.variantValue || '');
            this.generateBarcode();
          }
        });
      } else {
        const values = this.variantValues();
        this.selectedVariantValue = values[0] || (this.selectedProduct.variantValue || '');
        this.generateBarcode();
      }
    }
  }

  variantValues(): string[] {
    const list = Array.isArray(this.selectedProduct?.variants) ? this.selectedProduct.variants : [];
    const values = list.map((e: any) => String(e?.value || '')).filter(Boolean);
    if (values.length === 0 && this.selectedProduct?.variantValue) {
      values.push(String(this.selectedProduct.variantValue));
    }
    return values;
  }

  deriveBarcodeValue(value: string): string {
    const list = Array.isArray(this.selectedProduct?.variants) ? this.selectedProduct.variants : [];
    const match = list.find((e: any) => String(e?.value || '') === String(value || ''));
    const base = match?.barcode || match?.sku || this.selectedProduct?.barcode || this.selectedProduct?.sku || '';
    if (!base) return '';
    const isProductLevel = base === this.selectedProduct?.barcode || base === this.selectedProduct?.sku;
    return isProductLevel ? `${base}-${value}` : base;
  }

  generateBarcode(): void {
    const fromInput = String(this.barcodeValue || '').trim();
    let value = fromInput;
    if (this.selectedProduct) {
      const v = String(this.selectedVariantValue || '').trim();
      value = v ? this.deriveBarcodeValue(v) : (this.selectedProduct.barcode || this.selectedProduct.sku || fromInput);
    }
    if (!value) {
      this.toastr.error('Please select a product and variant value or enter a barcode');
      return;
    }
    this.generatedBarcode = value;
  }

  getQrCodeValue(): string {
    const origin = window.location.origin;
    const payload = String(this.generatedBarcode || this.barcodeValue || this.selectedProduct?.sku || '').trim();
    return payload ? `${origin}/stock/transfer?sku=${encodeURIComponent(payload)}` : `${origin}/stock/transfer`;
  }

  saveBarcodeToProduct(): void {
    if (!this.selectedProduct || !this.barcodeValue) {
      this.toastr.error('Please select a product and enter a barcode');
      return;
    }
    this.productsService.update(this.selectedProduct.id, { barcode: this.barcodeValue }, []).subscribe({
      next: () => {
        this.toastr.success('Barcode saved to product');
        this.loadProducts();
      },
      error: () => {
        this.toastr.error('Failed to save barcode');
      }
    });
  }
}
