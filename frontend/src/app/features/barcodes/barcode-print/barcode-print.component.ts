import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProductsService } from '../../../core/services/products.service';

@Component({
  selector: 'app-barcode-print',
  templateUrl: './barcode-print.component.html',
  styleUrls: ['./barcode-print.component.scss']
})
export class BarcodePrintComponent implements OnInit {
  products: any[] = [];
  selectedProducts: any[] = [];
  loading = false;
  printFormat = 'standard';
  quantity = 1;

  constructor(
    private productsService: ProductsService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.list({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.products = res.products;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load products');
        this.loading = false;
      }
    });
  }

  toggleProduct(product: any): void {
    const index = this.selectedProducts.findIndex(p => p.id === product.id);
    if (index >= 0) {
      this.selectedProducts.splice(index, 1);
    } else {
      this.selectedProducts.push(product);
    }
  }

  isSelected(product: any): boolean {
    return this.selectedProducts.some(p => p.id === product.id);
  }

  print(): void {
    if (this.selectedProducts.length === 0) {
      this.toastr.error('Please select at least one product');
      return;
    }
    window.print();
  }

  clearSelection(): void {
    this.selectedProducts = [];
  }
}
