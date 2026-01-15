import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-stock-logs',
  templateUrl: './stock-logs.component.html',
  styleUrls: ['./stock-logs.component.scss']
})
export class StockLogsComponent implements OnInit {
  logs: any[] = [];
  loading = true;
  warehouses: any[] = [];
  selectedWarehouse: string = '';
  page = 1;
  pageSize = 20;
  total = 0;

  constructor(
    private api: ApiService,
    private warehouseService: WarehouseService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadLogs();
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

  loadLogs(): void {
    this.loading = true;
    const params: any = { page: this.page, limit: this.pageSize };
    if (this.selectedWarehouse) {
      params.warehouseId = this.selectedWarehouse;
    }
    // Assuming there's a stock movements endpoint
    this.api.get('/warehouses/stock/movements', params).subscribe({
      next: (res: any) => {
        this.logs = res.data || res.movements || [];
        this.total = res.total || this.logs.length;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load stock logs');
        this.loading = false;
      }
    });
  }

  onWarehouseChange(): void {
    this.page = 1;
    this.loadLogs();
  }

  next(): void {
    if (this.page * this.pageSize >= this.total) return;
    this.page++;
    this.loadLogs();
  }

  prev(): void {
    if (this.page === 1) return;
    this.page--;
    this.loadLogs();
  }
}
