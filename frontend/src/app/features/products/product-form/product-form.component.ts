import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProductsService, Product } from '../../../core/services/products.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { SuppliersService, Supplier } from '../../../core/services/suppliers.service';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  form = this.fb.group({
    name: ['', Validators.required],
    sku: ['', Validators.required],
    barcode: [''],
    category: [''],
    brand: [''],
    variant: [''],
    variantValue: [''],
    variantQty: [''],
    supplier: [''],
    uom: ['pcs'],
    cost: [''],
    price: [''],
    description: ['']
  });
  images: File[] = [];
  currentImages: string[] = [];
  categories: any[] = [];
  brands: any[] = [];
  variants: any[] = [];
  variantValueOptions: string[] = [];
  variantsList: { option: string; value: string; qty: number }[] = [];
  suppliers: Supplier[] = [];
  suppliersLoading = false;
  catalogLoading = false;
  loading = true;
  saving = false;
  productId: string | null = null;
  showInlineSupplierForm = false;
  get isEditMode(): boolean { return !!this.productId; }
  get imageNames(): string[] { return this.images.map(f => f.name); }

  constructor(
    private fb: FormBuilder,
    private products: ProductsService,
    private catalog: CatalogService,
    private suppliersService: SuppliersService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.loadCatalog();
    this.form.get('variant')?.valueChanges.subscribe((variantId) => {
      this.refreshVariantValues(true, variantId || undefined);
    });
    if (this.productId) {
      this.loadProduct(this.productId);
    } else {
      this.loading = false;
    }
  }

  loadCatalog(): void {
    this.catalogLoading = true;
    let completed = 0;
    const total = 4;
    const checkComplete = () => {
      completed++;
      if (completed >= total) {
        this.catalogLoading = false;
      }
    };
    
    this.catalog.listCategories().subscribe({
      next: (cats) => { this.categories = cats; checkComplete(); },
      error: () => { checkComplete(); }
    });
    this.catalog.listBrands().subscribe({
      next: (brands) => { this.brands = brands; checkComplete(); },
      error: () => { checkComplete(); }
    });
    this.catalog.listVariants().subscribe({
      next: (variants) => { 
        this.variants = variants; 
        if (this.form.value.variant) {
          this.refreshVariantValues();
        }
        checkComplete(); 
      },
      error: () => { checkComplete(); }
    });

    this.suppliersLoading = true;
    this.suppliersService.list({ limit: 1000 }).subscribe({
      next: (res) => {
        this.suppliers = res.suppliers || [];
        this.suppliersLoading = false;
        checkComplete();
      },
      error: () => {
        this.suppliersLoading = false;
        checkComplete();
      }
    });
  }

  loadProduct(id: string): void {
    this.products.get(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          name: product.name || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          category: product.category || '',
          brand: product.brand || '',
          variant: (product as any).variant || '',
          variantValue: (product as any).variantValue || '',
          supplier: (product as any).supplier || '',
          uom: (product as any).uom || 'pcs',
          cost: product.cost != null ? String(product.cost) : '',
          price: product.price != null ? String(product.price) : '',
          description: product.description || ''
        });
        this.currentImages = (product as any).images || [];
        const pv = (product as any).variants || [];
        if (Array.isArray(pv)) {
          this.variantsList = pv
            .map((e: any) => ({
              option: e?.option ? String(e.option) : '',
              value: e?.value ? String(e.value) : '',
              qty: Number(e?.qty || 0)
            }))
            .filter((e) => e.option && e.value);
        } else {
          this.variantsList = [];
        }
        this.refreshVariantValues();
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load product');
        this.router.navigate(['/products']);
      }
    });
  }

  refreshVariantValues(reset: boolean = false, explicitVariantId?: string): void {
    const variantId = explicitVariantId !== undefined ? explicitVariantId : (this.form.value.variant as string);
    
    // Always clear options first to prevent data leak
    this.variantValueOptions = [];
    
    if (reset) {
      this.form.patchValue({ variantValue: '' }, { emitEvent: false });
    }

    if (!variantId) {
      if (!reset) this.form.patchValue({ variantValue: '' }, { emitEvent: false });
      return;
    }
    
    const v = this.variants.find((item: any) => String(item?.id) === String(variantId));
    
    if (!v) {
      if (!reset) this.form.patchValue({ variantValue: '' }, { emitEvent: false });
      return;
    }
    
    const values: any = v?.values;
    
    let options: string[] = [];
    if (Array.isArray(values)) {
      options = values.map((e: any) => {
        if (typeof e === 'string') return e;
        if (e?.name) return e.name;
        if (e?.code) return e.code;
        if (e?.value) return e.value;
        return String(e || '');
      }).filter(Boolean);
    } else if (values && typeof values === 'object') {
      options = Object.values(values).map((e: any) => {
        if (typeof e === 'string') return e;
        if (e?.name) return e.name;
        if (e?.code) return e.code;
        if (e?.value) return e.value;
        return String(e || '');
      }).filter(Boolean);
    } else if (typeof values === 'string') {
      options = values.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    
    this.variantValueOptions = options;
    
    if (!reset) {
      const current = this.form.value.variantValue as string;
      if (current && !options.includes(current)) {
        this.form.patchValue({ variantValue: '' }, { emitEvent: false });
      }
    }
  }

  addVariantEntry(): void {
    const option = String(this.form.value.variant || '').trim();
    const value = String(this.form.value.variantValue || '').trim();
    const qty = Number(this.form.value.variantQty || 0);
    if (!option || !value) {
      this.toastr.error('Select variant and value before adding');
      return;
    }
    const existingIdx = this.variantsList.findIndex((v) => v.option === option && v.value === value);
    if (existingIdx >= 0) {
      this.variantsList[existingIdx].qty = qty;
      this.toastr.info('Variant entry updated');
    } else {
      this.variantsList.push({ option, value, qty: Math.max(0, qty) });
      this.toastr.success('Variant entry added');
    }
    // Clear the value and quantity fields only, keep the variant selected
    this.form.patchValue({ variantValue: '', variantQty: '' }, { emitEvent: false });
  }

  removeVariantEntry(index: number): void {
    if (index >= 0 && index < this.variantsList.length) {
      this.variantsList.splice(index, 1);
      this.toastr.info('Variant entry removed');
    }
  }

  onFilesSelected(files: File[]): void {
    this.images = files;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    // Auto-add pending variant entry if populated but not added
    const pendingOption = String(this.form.value.variant || '').trim();
    const pendingValue = String(this.form.value.variantValue || '').trim();
    if (pendingOption && pendingValue) {
      this.addVariantEntry();
    }

    const payload: any = {
      ...this.form.value,
      cost: this.form.value.cost ? Number(this.form.value.cost) : undefined,
      price: this.form.value.price ? Number(this.form.value.price) : undefined
    };

    if (this.variantsList.length > 0) {
      payload.variants = this.variantsList.map((v, i) => ({
        option: v.option,
        value: v.value,
        qty: Math.max(0, Number(v.qty) || 0),
        sortOrder: i
      }));
    }

    // Do not send empty supplier values to backend (avoids invalid ObjectId casting)
    if (!payload.supplier) {
      delete payload.supplier;
    }
    this.saving = true;
    const request = this.productId
      ? this.products.update(this.productId, payload, this.images)
      : this.products.create(payload, this.images);
    request.subscribe({
      next: (product: Product) => {
        this.toastr.success(`Product ${this.productId ? 'updated' : 'create d'}`);
        this.router.navigate(['/products', product.id]);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || `Failed to ${this.productId ? 'update' : 'create'} product`);
        this.saving = false;
      }
    });
  }

  onInlineSupplierSaved(supplier: Supplier): void {
    if (!supplier) {
      this.showInlineSupplierForm = false;
      return;
    }
    this.suppliers.push(supplier);
    this.form.patchValue({ supplier: supplier.id });
    this.showInlineSupplierForm = false;
  }
  
  getVariantName(optionId: string): string {
    const variant = this.variants.find(v => String(v.id) === String(optionId));
    return variant ? variant.name : optionId;
  }
}