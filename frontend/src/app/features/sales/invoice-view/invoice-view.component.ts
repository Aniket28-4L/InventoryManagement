import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { SalesService } from '../../../core/services/sales.service'

@Component({
  selector: 'app-invoice-view',
  templateUrl: './invoice-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceViewComponent implements OnInit {
  loading = false
  sale: any

  constructor(private route: ActivatedRoute, private salesService: SalesService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || ''
    if (id) this.load(id)
  }

  load(id: string): void {
    this.loading = true
    this.salesService.get(id).subscribe({
      next: (res) => { this.sale = res; this.loading = false },
      error: () => { this.loading = false }
    })
  }

  pdfUrl(): string { return this.sale ? this.salesService.invoicePdfUrl(this.sale.id) : '' }
}