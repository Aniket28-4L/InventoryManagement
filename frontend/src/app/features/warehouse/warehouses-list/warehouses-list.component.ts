import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WarehouseService } from '../../../core/services/warehouse.service';

@Component({
  selector: 'app-warehouses-list',
  templateUrl: './warehouses-list.component.html',
  styleUrls: ['./warehouses-list.component.scss']
})
export class WarehousesListComponent implements OnInit, OnDestroy {
  warehouses: any[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = true;
  searchTerm = '';
  deleteTarget: any = null;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(
    private warehouseService: WarehouseService,
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
      this.fetchWarehouses(1);
    });
    this.fetchWarehouses();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  fetchWarehouses(page = this.page): void {
    this.loading = true;
    const params: any = { page, limit: this.pageSize };
    if (this.searchTerm && this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    this.warehouseService.list(params).subscribe({
      next: (res) => {
        this.warehouses = res.warehouses;
        this.page = res.page;
        this.total = res.total;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load warehouses');
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
    this.fetchWarehouses(1);
  }

  search(): void {
    this.page = 1;
    this.fetchWarehouses(1);
  }

  openDelete(warehouse: any): void {
    this.deleteTarget = warehouse;
  }

  closeDelete(): void {
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.warehouseService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.toastr.success('Warehouse deleted successfully');
        this.closeDelete();
        this.fetchWarehouses(this.page);
      },
      error: () => {
        this.toastr.error('Failed to delete warehouse');
      }
    });
  }

  goTo(page: number): void {
    if (page < 1 || page === this.page) return;
    this.page = page;
    this.fetchWarehouses(page);
  }

  next(): void {
    if (this.page * this.pageSize >= this.total) return;
    this.goTo(this.page + 1);
  }

  prev(): void {
    if (this.page === 1) return;
    this.goTo(this.page - 1);
  }

  formatAddress(warehouse: any): string {
    if (!warehouse || !warehouse.address) return '-';
    const a = warehouse.address;
    const parts = [a.street, a.city, a.state, a.zipCode, a.country].filter((v) => !!v);
    return parts.length > 0 ? parts.join(', ') : '-';
  }
}
