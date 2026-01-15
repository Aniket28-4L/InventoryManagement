import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit {
  stats = {
    totalProducts: 0,
    totalWarehouses: 0,
    totalStockItems: 0,
    lowStockItems: 0,
    movesToday: 0
  };
  movementData: { name: string; moves: number }[] = [];
  recentActivity: { id: string; description: string; timeAgo: string }[] = [];
  loading = true;

  constructor(
    public auth: AuthService,
    private dashboard: DashboardService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Redirect Sales users to sales page
    if (this.auth.role === 'Sales') {
      this.router.navigate(['/sales']);
      return;
    }
    // Redirect Store Keeper users to warehouses page
    if (this.auth.role === 'Store Keeper') {
      this.router.navigate(['/warehouses']);
      return;
    }
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    this.loading = true;
    this.dashboard.getDashboardData().subscribe({
      next: (data) => {
        this.stats = {
          totalProducts: data?.totalProducts || 0,
          totalWarehouses: data?.totalWarehouses || 0,
          totalStockItems: data?.totalStockItems || 0,
          lowStockItems: data?.lowStock || 0,
          movesToday: data?.movesToday || 0
        };
        this.movementData = (data?.movement || []).map((m: any) => ({
          name: m.date || m.name || 'Day',
          moves: m.moves || 0
        }));
        this.recentActivity = (data?.recent || []).map((log: any, idx: number) => {
          const type = String(log.type || '').toUpperCase();
          const product = log.productName || log.product?.name || log.product || '';
          let description = log.description || '';
          if (!description) {
            if (type === 'IN') description = `Product Added — ${product}`;
            else if (type === 'OUT') description = `Product Sold — ${product}`;
            else description = (type || `Activity #${idx + 1}`);
          }
          return {
            id: log._id || `${idx}`,
            description,
            timeAgo: this.timeAgo(log.timestamp || log.createdAt || new Date())
          };
        });
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load dashboard data');
        this.loading = false;
      }
    });
  }

  timeAgo(date: string | Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  quickAddProduct(): void {
    this.router.navigate(['/products/new']);
  }

  newTransfer(): void {
    this.router.navigate(['/stock/transfer']);
  }

  gotoProducts(): void { this.router.navigate(['/products']); }
  gotoWarehouses(): void { this.router.navigate(['/warehouses']); }
  gotoStockHistory(): void { this.router.navigate(['/stock/logs']); }
  gotoLowStock(): void { this.router.navigate(['/reports/low-stock']); }
}


