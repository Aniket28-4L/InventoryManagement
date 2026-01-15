import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductsService, Product } from '../../../core/services/products.service';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss']
})
export class ProductsListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = true;
  exporting = false;
  searchTerm = '';
  deleteTarget: Product | null = null;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private queryParamsSubscription?: Subscription;

  constructor(
    private productsService: ProductsService, 
    public toastr: ToastrService, 
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Set up debounced search
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.page = 1;
      this.fetchProducts(1);
    });

    // Handle initial query params
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchTerm = params['q'];
        this.searchSubject.next(this.searchTerm);
      } else {
    this.fetchProducts();
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.queryParamsSubscription?.unsubscribe();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  fetchProducts(page = this.page): void {
    this.loading = true;
    const params: any = { page, limit: this.pageSize };
    if (this.searchTerm && this.searchTerm.trim()) {
      params.q = this.searchTerm.trim();
    }
    this.productsService.list(params).subscribe({
      next: (res) => {
        this.products = res.products;
        this.page = res.page;
        this.total = res.total;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load products');
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
    this.fetchProducts(1);
  }

  search(): void {
    this.page = 1;
    this.fetchProducts(1);
  }

  openDelete(product: Product): void {
    this.deleteTarget = product;
  }

  closeDelete(): void {
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.productsService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.toastr.success('Product deleted successfully');
        this.closeDelete();
        this.fetchProducts(this.page);
      },
      error: () => {
        this.toastr.error('Failed to delete product');
      }
    });
  }

  export(): void {
    if (this.exporting) {
      return;
    }
    this.exporting = true;
    const params: any = {};
    if (this.searchTerm && this.searchTerm.trim()) {
      params.q = this.searchTerm.trim();
    }
    this.productsService.exportXlsx(params).subscribe({
      next: (res) => {
        try {
          const byteCharacters = atob(res.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: res.mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.filename || 'products.xlsx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.toastr.success('Products exported successfully');
        } catch (e) {
          console.error('Failed to download export file:', e);
          this.toastr.error('Failed to download export file');
        } finally {
          this.exporting = false;
        }
      },
      error: (err) => {
        console.error('Export failed:', err);
        this.toastr.error('Failed to export products');
        this.exporting = false;
      }
    });
  }

  goTo(page: number): void {
    if (page < 1 || page === this.page) return;
    this.page = page;
    this.fetchProducts(page);
  }

  next(): void {
    if (this.page * this.pageSize >= this.total) return;
    this.goTo(this.page + 1);
  }

  prev(): void {
    if (this.page === 1) return;
    this.goTo(this.page - 1);
  }

  exportProducts(): void {
    this.productsService.exportXlsx().subscribe({
      next: ({ filename, mime, base64 }) => {
        const link = document.createElement('a');
        link.href = `data:${mime};base64,${base64}`;
        link.download = filename || 'products.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toastr.success('Products exported');
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Failed to export products';
        this.toastr.error(msg);
      }
    });
  }
}

