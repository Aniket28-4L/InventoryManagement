import { Component, OnInit } from '@angular/core'
import { SalesService } from '../../../core/services/sales.service'
import { Router } from '@angular/router'
import { ToastrService } from 'ngx-toastr'

@Component({ selector: 'app-sales-history', templateUrl: './sales-history.component.html' })
export class SalesHistoryComponent implements OnInit {
  loading = false
  page = 1
  total = 0
  pages = 0
  sales: any[] = []
  searchTerm = ''

  constructor(
    private salesService: SalesService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void { this.fetch(1) }

  fetch(page: number): void {
    this.loading = true
    this.salesService.list({ page, limit: 10 }).subscribe({
      next: (res) => { this.sales = res.data; this.page = res.page; this.total = res.total; this.pages = res.pages; this.loading = false },
      error: () => { this.loading = false }
    })
  }

  view(id: string): void { this.router.navigate(['/sales', id]) }

  deleteSale(id: string): void {
    if (confirm('Are you sure you want to delete this sale?')) {
      this.salesService.deleteSale(id).subscribe({
        next: () => {
          this.sales = this.sales.filter(s => s.id !== id);
          this.toastr.success('Sale deleted successfully');
        },
        error: (err) => {
          this.toastr.error(err.message || 'Failed to delete sale');
        }
      });
    }
  }

  productNames(s: any): string {
    return (s?.items || []).map((i: any) => i?.productName || '').filter(Boolean).join(', ')
  }

  pricesList(s: any): string {
    return (s?.items || []).map((i: any) => `${Number(i?.unitPrice || 0).toFixed(2)}`).join(', ')
  }

  quantitiesList(s: any): string {
    return (s?.items || []).map((i: any) => String(Number(i?.quantity || 0))).join(', ')
  }

  totalsList(s: any): string {
    return (s?.items || []).map((i: any) => {
      const price = Number(i?.unitPrice || 0)
      const qty = Number(i?.quantity || 0)
      const disc = Number(i?.discount || 0)
      // FIX: Discount is direct amount deduction, and prevent negative total
      const total = Math.max(0, (price * qty) - disc)
      return `${total.toFixed(2)}`
    }).join(', ')
  }

  filteredSales(): any[] {
    const q = this.searchTerm.trim().toLowerCase()
    if (!q) return this.sales
    return this.sales.filter((s) => this.productNames(s).toLowerCase().includes(q))
  }
}