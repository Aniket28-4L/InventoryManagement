import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { ProductsService } from '../../../core/services/products.service';

@Component({
  selector: 'app-supplier-form',
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss']
})
export class SupplierFormComponent implements OnInit {
  form = this.fb.group({
    name: ['', Validators.required],
    companyName: ['', Validators.required],
    contactName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    city: [''],
    state: [''],
    zipCode: [''],
    country: [''],
    website: [''],
    notes: [''],
    products: [[] as string[]]
  });
  loading = true;
  saving = false;
  supplierId: string | null = null;
  products: any[] = [];
  selectedProducts: any[] = [];
  productsLoading = false;
  get isEditMode(): boolean { return !!this.supplierId; }

  @Input() inline = false;
  @Output() saved = new EventEmitter<any>();

  constructor(
    private fb: FormBuilder,
    private suppliersService: SuppliersService,
    private productsService: ProductsService,
    private route: ActivatedRoute,
    public router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    this.loadProducts();
    if (this.supplierId) {
      this.loadSupplier(this.supplierId);
    } else {
      this.loading = false;
    }
  }

  loadProducts(): void {
    this.productsLoading = true;
    this.productsService.list({ limit: 1000 }).subscribe({
      next: (res) => {
        this.products = res.products || [];
        this.productsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.productsLoading = false;
        this.toastr.warning('Failed to load products list');
      }
    });
  }

  loadSupplier(id: string): void {
    this.loading = true;
    this.suppliersService.get(id).subscribe({
      next: (supplier) => {
        const address = supplier.address || {};
        const addressObj = typeof address === 'string' ? {} : (address as Record<string, string>);
        const supplierProducts = (supplier as any).products || [];
        const productIds = supplierProducts.map((p: any) => p.product?.id || p.product?._id || p.product).filter(Boolean);
        
        this.form.patchValue({
          name: supplier.name || '',
          companyName: supplier.companyName || '',
          contactName: supplier.contact?.person || '',
          email: supplier.contact?.email || '',
          phone: supplier.contact?.phone || '',
          address: typeof address === 'string' ? address : (addressObj['street'] || addressObj['address'] || ''),
          city: addressObj['city'] || '',
          state: addressObj['state'] || '',
          zipCode: addressObj['postalCode'] || addressObj['zipCode'] || addressObj['zip'] || '',
          country: addressObj['country'] || '',
          website: supplier.business?.['website'] || '',
          notes: supplier.notes || '',
          products: productIds
        });
        this.selectedProducts = this.products.filter(p => productIds.includes(p.id));
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load supplier');
        this.loading = false;
        this.router.navigate(['/suppliers']);
      }
    });
  }

  onProductSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const productId = selectElement.value;
    if (!productId) return;
    
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    const productIds = (this.form.value.products as string[]) || [];
    if (!productIds.includes(product.id)) {
      this.selectedProducts.push(product);
      this.form.patchValue({ products: [...productIds, product.id] as string[] });
    }
    selectElement.value = '';
  }

  removeProduct(productId: string): void {
    this.selectedProducts = this.selectedProducts.filter(p => p.id !== productId);
    const productIds = ((this.form.value.products as string[]) || []).filter((id: string) => id !== productId);
    this.form.patchValue({ products: productIds as string[] });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) {
      if (this.form.invalid) {
        this.toastr.error('Please fill in all required fields');
      }
      return;
    }
    this.saving = true;
    const formValue = this.form.value;
    const payload: any = {
      name: formValue.name || '',
      companyName: formValue.companyName || '',
      contact: {
        person: formValue.contactName || undefined,
        email: formValue.email || undefined,
        phone: formValue.phone || undefined
      },
      address: {
        street: formValue.address || undefined,
        city: formValue.city || undefined,
        state: formValue.state || undefined,
        postalCode: formValue.zipCode || undefined,
        country: formValue.country || undefined
      },
      business: {
        website: formValue.website || undefined
      },
      notes: formValue.notes || undefined
    };

    // Add products if selected
    const productIds = formValue.products || [];
    if (productIds.length > 0) {
      payload.products = productIds.map((productId: string) => ({
        product: productId
      }));
    }
    
    // Remove undefined values to avoid sending null
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
      if (typeof payload[key] === 'object' && payload[key] !== null && !Array.isArray(payload[key])) {
        Object.keys(payload[key]).forEach(subKey => {
          if (payload[key][subKey] === undefined) delete payload[key][subKey];
        });
        if (Object.keys(payload[key]).length === 0) delete payload[key];
      }
    });
    
    console.log('Submitting supplier payload:', payload);
    
    const operation = this.isEditMode
      ? this.suppliersService.update(this.supplierId!, payload)
      : this.suppliersService.create(payload);

    operation.subscribe({
      next: (supplier) => {
        this.toastr.success(`Supplier ${this.isEditMode ? 'updated' : 'created'} successfully`);

        if (this.inline) {
          this.saved.emit(supplier);
        } else {
          this.router.navigate(['/suppliers']);
        }
      },
      error: (error: any) => {
        console.error('Supplier create/update error:', error);
        let errorMessage = `Failed to ${this.isEditMode ? 'update' : 'create'} supplier`;
        
        if (error?.error) {
          if (error.error.errors && Array.isArray(error.error.errors)) {
            const validationErrors = error.error.errors.map((e: any) => e.msg || e.message || e).join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.toastr.error(errorMessage);
        this.saving = false;
      }
    });
  }
}
