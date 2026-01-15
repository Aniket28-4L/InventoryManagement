import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-catalog-manager',
  templateUrl: './catalog-manager.component.html',
  styleUrls: ['./catalog-manager.component.scss']
})
export class CatalogManagerComponent implements OnInit {
  activeTab: 'categories' | 'brands' | 'variants' | 'stores' = 'categories';
  categories: any[] = [];
  brands: any[] = [];
  variants: any[] = [];
  stores: any[] = [];
  loading = false;
  showAddModal = false;
  editItem: any = null;
  formData = { name: '', parent: '' };
  variantValues: string[] = [''];

  constructor(
    private catalogService: CatalogService,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read route data to determine which section to show
    const routeType = this.route.snapshot.data['type'];
    if (routeType === 'category') {
      this.activeTab = 'categories';
    } else if (routeType === 'brand') {
      this.activeTab = 'brands';
    } else if (routeType === 'variant') {
      this.activeTab = 'variants';
    } else if (routeType === 'store') {
      this.activeTab = 'stores';
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    if (this.activeTab === 'categories') {
      this.catalogService.listCategories().subscribe({
        next: (res) => {
          this.categories = res;
          this.loading = false;
        },
        error: () => {
          this.toastr.error('Failed to load categories');
          this.loading = false;
        }
      });
    } else if (this.activeTab === 'brands') {
      this.catalogService.listBrands().subscribe({
        next: (res) => {
          this.brands = res;
          this.loading = false;
        },
        error: () => {
          this.toastr.error('Failed to load brands');
          this.loading = false;
        }
      });
    } else if (this.activeTab === 'variants') {
      this.catalogService.listVariants().subscribe({
        next: (res) => {
          this.variants = res;
          this.loading = false;
        },
        error: () => {
          this.toastr.error('Failed to load variants');
          this.loading = false;
        }
      });
    } else {
      this.catalogService.listStores().subscribe({
        next: (res) => {
          this.stores = res;
          this.loading = false;
        },
        error: () => {
          this.toastr.error('Failed to load stores');
          this.loading = false;
        }
      });
    }
  }

  switchTab(tab: 'categories' | 'brands' | 'variants' | 'stores'): void {
    this.activeTab = tab;
    this.loadData();
  }

  openAddModal(): void {
    this.editItem = null;
    this.formData = { name: '', parent: '' };
    this.variantValues = [''];
    this.showAddModal = true;
  }

  openEditModal(item: any): void {
    this.editItem = item;
    this.formData = { name: item.name || '', parent: item.parent || '' };
    if (this.activeTab === 'variants') {
      const v = item.values || {};
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        this.variantValues = Object.keys(v);
        if (this.variantValues.length === 0) this.variantValues = [''];
      } else if (Array.isArray(v)) {
        this.variantValues = v.map((e: any) => e?.name || e?.code || String(e || '')).filter(Boolean);
        if (this.variantValues.length === 0) this.variantValues = [''];
      } else {
        this.variantValues = [''];
      }
    }
    this.showAddModal = true;
  }

  closeModal(): void {
    this.showAddModal = false;
    this.editItem = null;
    this.formData = { name: '', parent: '' };
  }

  save(): void {
    if (!this.formData.name) {
      this.toastr.error('Name is required');
      return;
    }
    const payload: any = { name: this.formData.name };
    if (this.formData.parent) {
      payload.parent = this.formData.parent;
    }
    if (this.activeTab === 'variants') {
      const valuesList: string[] = this.variantValues.map(v => v?.trim()).filter(v => !!v);
      payload.values = valuesList.map((name, idx) => ({ name, sortOrder: idx }));
    }

    if (this.editItem) {
      const itemId = this.editItem.id || this.editItem._id;
      if (!itemId) {
        this.toastr.error('Invalid item ID');
        return;
      }
    }

    const itemId = this.editItem?.id || this.editItem?._id;
    console.log('Saving item:', { itemId, payload, editItem: this.editItem, activeTab: this.activeTab });
    
    let operation;
    if (this.activeTab === 'categories') {
      operation = this.editItem
        ? this.catalogService.updateCategory(itemId, payload)
        : this.catalogService.createCategory(payload);
    } else if (this.activeTab === 'brands') {
      operation = this.editItem
        ? this.catalogService.updateBrand(itemId, payload)
        : this.catalogService.createBrand(payload);
    } else if (this.activeTab === 'variants') {
      operation = this.editItem
        ? this.catalogService.updateVariant(itemId, payload)
        : this.catalogService.createVariant(payload);
    } else {
      operation = this.editItem
        ? this.catalogService.updateStore(itemId, payload)
        : this.catalogService.createStore(payload);
    }

    operation.subscribe({
      next: () => {
        this.toastr.success(`${this.activeTab === 'categories' ? 'Category' : this.activeTab === 'brands' ? 'Brand' : this.activeTab === 'variants' ? 'Variant' : 'Store'} ${this.editItem ? 'updated' : 'created'} successfully`);
        this.closeModal();
        this.loadData();
      },
      error: (err: any) => {
        console.error('Save error:', err);
        console.error('Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          url: err?.url,
          error: err?.error,
          message: err?.message
        });
        const errorMsg = err?.error?.message || err?.message || `Failed to ${this.editItem ? 'update' : 'create'} ${this.activeTab === 'categories' ? 'category' : this.activeTab === 'brands' ? 'brand' : this.activeTab === 'variants' ? 'variant' : 'store'}`;
        this.toastr.error(errorMsg);
      }
    });
  }

  addVariantValue(): void {
    this.variantValues.push('');
  }

  removeVariantValue(index: number): void {
    if (this.variantValues.length > 1) {
      this.variantValues.splice(index, 1);
    } else {
      this.variantValues[0] = '';
    }
  }

  trackByIndex(index: number): number { return index; }

  deleteItem(item: any): void {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    const itemId = item.id || item._id;
    if (!itemId) {
      this.toastr.error('Invalid item ID');
      return;
    }
    
    console.log('Deleting item:', { itemId, item, activeTab: this.activeTab });
    
    let operation;
    if (this.activeTab === 'categories') {
      operation = this.catalogService.deleteCategory(itemId);
    } else if (this.activeTab === 'brands') {
      operation = this.catalogService.deleteBrand(itemId);
    } else if (this.activeTab === 'variants') {
      operation = this.catalogService.deleteVariant(itemId);
    } else {
      operation = this.catalogService.deleteStore(itemId);
    }

    operation.subscribe({
      next: () => {
        this.toastr.success(`${this.activeTab === 'categories' ? 'Category' : this.activeTab === 'brands' ? 'Brand' : this.activeTab === 'variants' ? 'Variant' : 'Store'} deleted successfully`);
        this.loadData();
      },
      error: (err: any) => {
        console.error('Delete error:', err);
        console.error('Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          url: err?.url,
          error: err?.error,
          message: err?.message
        });
        const errorMsg = err?.error?.message || err?.message || `Failed to delete ${this.activeTab === 'categories' ? 'category' : this.activeTab === 'brands' ? 'brand' : this.activeTab === 'variants' ? 'variant' : 'store'}`;
        this.toastr.error(errorMsg);
      }
    });
  }

  get currentItems(): any[] {
    if (this.activeTab === 'categories') return this.categories;
    if (this.activeTab === 'brands') return this.brands;
    if (this.activeTab === 'variants') return this.variants;
    return this.stores;
  }
}
