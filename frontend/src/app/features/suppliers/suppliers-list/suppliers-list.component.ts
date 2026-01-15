import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SuppliersService, Supplier } from '../../../core/services/suppliers.service';

@Component({
  selector: 'app-suppliers-list',
  templateUrl: './suppliers-list.component.html',
  styleUrls: ['./suppliers-list.component.scss']
})
export class SuppliersListComponent implements OnInit, OnDestroy {
  suppliers: Supplier[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = true;
  searchTerm = '';
  deleteTarget: Supplier | null = null;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(
    private suppliersService: SuppliersService,
    public toastr: ToastrService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Set up debounced search
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page = 1;
      this.fetchSuppliers(1);
    });
    this.fetchSuppliers();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  fetchSuppliers(page = this.page): void {
    this.loading = true;
    const params: any = { page, limit: this.pageSize };
    if (this.searchTerm && this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    this.suppliersService.list(params).subscribe({
      next: (res) => {
        this.suppliers = res.suppliers;
        this.page = res.page;
        this.total = res.total;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load suppliers');
        this.loading = false;
      }
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
    this.page = 1;
    this.fetchSuppliers(1);
  }

  search(): void {
    this.page = 1;
    this.fetchSuppliers(1);
  }

  openDelete(supplier: Supplier): void {
    this.deleteTarget = supplier;
  }

  closeDelete(): void {
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.suppliersService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.toastr.success('Supplier deleted successfully');
        this.closeDelete();
        this.fetchSuppliers(this.page);
      },
      error: () => {
        this.toastr.error('Failed to delete supplier');
      }
    });
  }

  goTo(page: number): void {
    if (page < 1 || page === this.page) return;
    this.page = page;
    this.fetchSuppliers(page);
  }

  next(): void {
    if (this.page * this.pageSize >= this.total) return;
    this.goTo(this.page + 1);
  }

  prev(): void {
    if (this.page === 1) return;
    this.goTo(this.page - 1);
  }

  getSupplierProducts(supplier: any): any[] {
    if (!supplier) return [];
    // Handle both populated and unpopulated product structures
    const products = supplier.products || [];
    return products.map((p: any) => {
      // If product is populated, it will have a product object with name
      // If not populated, it might just be an ID or have product as an ID
      if (p.product && typeof p.product === 'object' && p.product.name) {
        return { name: p.product.name, id: p.product._id || p.product.id };
      }
      // Fallback for unpopulated or different structures
      return { name: p.name || '-', id: p.product || p._id || p.id };
    }).filter((p: any) => p.name && p.name !== '-');
  }
}
