import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { StockTransferService } from '../../../core/services/stock-transfer.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ProductsService } from '../../../core/services/products.service';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-stock-transfer',
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss']
})
export class StockTransferComponent implements OnInit {
  transfers: any[] = [];
  warehouses: any[] = [];
  stores: any[] = [];
  products: any[] = [];
  productVariants: any[] = [];
  loading = true;
  showAddModal = false;
  transferForm = {
    fromWarehouse: '',
    toWarehouse: '',
    toStore: '',
    destinationType: 'warehouse',
    productId: '',
    variantValue: '',
    quantity: '',
    notes: ''
  };

  constructor(
    private stockTransferService: StockTransferService,
    private warehouseService: WarehouseService,
    private productsService: ProductsService,
    private catalogService: CatalogService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.loadTransfers();
    this.loadWarehouses();
    this.loadStores();
    this.loadProducts();
    this.route.queryParams.subscribe((params) => {
      const sku = String(params['sku'] || '').trim();
      const type = String(params['type'] || '').trim();
      const dest = String(params['dest'] || '').trim();
      const variant = String(params['variant'] || '').trim();
      if (sku) {
        this.prefillFromSku(sku, type, dest, variant);
      }
    });
  }

  loadTransfers(): void {
    this.loading = true;
    this.stockTransferService.list({}).subscribe({
      next: (res) => {
        this.transfers = Array.isArray(res) ? res : [];
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load stock transfers');
        this.loading = false;
      }
    });
  }

  deleteTransfer(id: string): void {
    if (confirm('Are you sure you want to delete this stock transfer?')) {
      this.stockTransferService.deleteStockTransfer(id).subscribe({
        next: () => {
          this.transfers = this.transfers.filter(t => t.id !== id);
          this.toastr.success('Stock transfer deleted successfully');
        },
        error: (err) => {
          this.toastr.error(err.message || 'Failed to delete stock transfer');
        }
      });
    }
  }

  loadWarehouses(): void {
    this.warehouseService.list({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.warehouses = res.warehouses;
      },
      error: () => {
        this.toastr.error('Failed to load warehouses');
      }
    });
  }

  loadStores(): void {
    this.catalogService.listStores().subscribe({
      next: (res) => { this.stores = res; },
      error: () => { this.toastr.error('Failed to load stores'); }
    });
  }

  loadProducts(): void {
    this.productsService.list({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.products = res.products;
      },
      error: () => {
        this.toastr.error('Failed to load products');
      }
    });
  }

  onProductChange(productId: string, preserveVariant?: string): void {
    if (!productId) {
      this.productVariants = [];
      this.transferForm.variantValue = '';
      return;
    }
    
    const product = this.products.find(p => p.id === productId);
    if (product) {
      // Extract variants from the product
      if (product.variants && Array.isArray(product.variants)) {
        this.productVariants = product.variants.map((v: any) => ({
          value: v.value,
          option: v.option,
          barcode: v.barcode,
          sku: v.sku
        }));
        
        // If a variant should be preserved/pre-selected, set it
        if (preserveVariant) {
          const matchedVariant = this.productVariants.find(v => 
            v.value?.toLowerCase() === preserveVariant.toLowerCase()
          );
          if (matchedVariant) {
            this.transferForm.variantValue = matchedVariant.value;
          }
        } else {
          // Reset variant selection when product changes normally
          this.transferForm.variantValue = '';
        }
      } else {
        this.productVariants = [];
        this.transferForm.variantValue = '';
      }
    }
  }

  private prefillFromSku(skuOrBarcode: string, type?: string, dest?: string, variant?: string): void {
    // Attempt backend lookup by barcode/sku
    this.api.get<{ success: boolean; data: any }>(`/barcodes/scan?barcode=${encodeURIComponent(skuOrBarcode)}`).subscribe({
      next: (res) => {
        const prod = res?.data;
        if (prod?.id || prod?._id) {
          this.showAddModal = true;
          this.transferForm.productId = prod.id || prod._id;
          
          // Determine variant to pre-select
          const variantToSelect = variant || prod.matchedVariant?.value || '';
          
          // Wait for products to be loaded, then trigger product change with variant
          const waitForProducts = () => {
            if (this.products && this.products.length > 0) {
              this.onProductChange(this.transferForm.productId, variantToSelect);
            } else {
              setTimeout(waitForProducts, 200);
            }
          };
          waitForProducts();
          
          if (type === 'store') {
            this.transferForm.destinationType = 'store';
            this.transferForm.toStore = dest || '';
          } else if (type === 'warehouse') {
            this.transferForm.destinationType = 'warehouse';
            this.transferForm.toWarehouse = dest || '';
          }
        } else {
          this.toastr.error('No product found for scanned code');
        }
      },
      error: () => {
        // Fallback: try to match from already loaded products list
        const waitForProducts = () => {
          if (this.products && this.products.length > 0) {
            // Try to extract variant from scanned code if not provided
            let variantToSelect = variant || '';
            if (!variantToSelect && skuOrBarcode.includes('-')) {
              variantToSelect = skuOrBarcode.split('-').slice(1).join('-');
            }
            
            const matched = this.products.find(p => 
              String(p.barcode || '').trim().toLowerCase() === skuOrBarcode.toLowerCase() || 
              String(p.sku || '').trim().toLowerCase() === skuOrBarcode.toLowerCase() ||
              String(p.sku || '').trim().toLowerCase() === skuOrBarcode.split('-')[0].toLowerCase()
            );
            if (matched?.id) {
              this.showAddModal = true;
              this.transferForm.productId = matched.id;
              this.onProductChange(matched.id, variantToSelect);
              
              if (type === 'store') {
                this.transferForm.destinationType = 'store';
                this.transferForm.toStore = dest || '';
              } else if (type === 'warehouse') {
                this.transferForm.destinationType = 'warehouse';
                this.transferForm.toWarehouse = dest || '';
              }
            } else {
              this.toastr.error('Failed to prefill product from scanned code');
            }
          } else {
            setTimeout(waitForProducts, 200);
          }
        };
        setTimeout(waitForProducts, 500);
      }
    });
  }

  openAddModal(): void {
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.transferForm = {
      fromWarehouse: '',
      toWarehouse: '',
      toStore: '',
      destinationType: 'warehouse',
      productId: '',
      variantValue: '',
      quantity: '',
      notes: ''
    };
  }

  submitTransfer(): void {
    if (!this.transferForm.fromWarehouse || !this.transferForm.productId || !this.transferForm.quantity) {
      this.toastr.error('Please fill in all required fields');
      return;
    }
    
    // Check if product has variants and variant is required
    const selectedProduct = this.products.find(p => p.id === this.transferForm.productId);
    if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0 && !this.transferForm.variantValue) {
      this.toastr.error('Please select a variant for this product');
      return;
    }
    
    const isToStore = this.transferForm.destinationType === 'store';
    if (isToStore && !this.transferForm.toStore) {
      this.toastr.error('Please select destination store');
      return;
    }
    if (!isToStore && !this.transferForm.toWarehouse) {
      this.toastr.error('Please select destination warehouse');
      return;
    }
    if (!isToStore && this.transferForm.fromWarehouse === this.transferForm.toWarehouse) {
      this.toastr.error('Source and destination warehouses cannot be the same');
      return;
    }
    
    const qty = parseInt(String(this.transferForm.quantity), 10);
    if (!Number.isInteger(qty) || qty < 1) {
      this.toastr.error('Quantity must be a positive integer');
      return;
    }
    
    if (isToStore) {
      // For warehouse-to-store transfers, create a completed stock transfer record
      const payload = {
        transferNumber: `TRF-${new Date().getTime()}-${Math.floor(1000 + Math.random() * 9000)}`, // Generate a unique transfer number
        fromWarehouse: this.transferForm.fromWarehouse,
        toStore: this.transferForm.toStore,  // Using toStore field for store transfers
        items: [{
          product: this.transferForm.productId,
          sku: selectedProduct?.sku || '',
          quantity: qty,
          notes: this.transferForm.notes,
          variantValue: this.transferForm.variantValue || undefined  // Pass variant value if exists
        }],
        notes: this.transferForm.notes,
        status: 'completed', // Set status to completed for immediate processing
        requestedDate: new Date(),
        completedDate: new Date() // Add completed date for immediate completion
      };
      this.stockTransferService.create(payload).subscribe({
        next: (response) => {
          this.toastr.success('Stock transfer to store completed successfully');
          this.closeAddModal();
          this.loadTransfers();
        },
        error: (error: any) => {
          const backendMsg = error?.error?.message || error?.error?.errors?.[0]?.msg;
          this.toastr.error(backendMsg || error?.message || 'Failed to create stock transfer to store');
        }
      });
    } else {
      const payload = {
        transferNumber: `TRF-${new Date().getTime()}-${Math.floor(1000 + Math.random() * 9000)}`, // Generate a unique transfer number
        fromWarehouse: this.transferForm.fromWarehouse,
        toWarehouse: this.transferForm.toWarehouse,
        items: [{
          product: this.transferForm.productId,
          sku: selectedProduct?.sku || '',
          quantity: qty,
          notes: this.transferForm.notes,
          variantValue: this.transferForm.variantValue || undefined  // Pass variant value if exists
        }],
        notes: this.transferForm.notes,
        status: 'completed', // Set status to completed for immediate processing
        requestedDate: new Date(),
        completedDate: new Date() // Add completed date for immediate completion
      };
      this.stockTransferService.create(payload).subscribe({
        next: (response) => {
          this.toastr.success('Stock transfer completed successfully');
          this.closeAddModal();
          this.loadTransfers();
        },
        error: (error: any) => {
          const backendMsg = error?.error?.message || error?.error?.errors?.[0]?.msg;
          this.toastr.error(backendMsg || error?.message || 'Failed to create stock transfer');
        }
      });
    }
  }
}
