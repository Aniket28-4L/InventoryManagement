import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProductsService } from '../../../core/services/products.service';
import * as XLSX from 'xlsx';
import { parse } from 'papaparse';

@Component({
  selector: 'app-product-import',
  templateUrl: './product-import.component.html',
  styleUrls: ['./product-import.component.scss']
})
export class ProductImportComponent {
  rows: any[] = [];
  selectedFile: File | null = null;

  constructor(
    private toastr: ToastrService,
    private productsService: ProductsService,
    private router: Router
  ) {}

  async onFilesSelected(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;
    this.selectedFile = file;
    if (file.name.endsWith('.csv')) {
      parse(file, {
        header: true,
        complete: (res: any) => {
          this.rows = res.data.filter(Boolean);
        }
      });
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      this.rows = data as any[];
    }
  }

  importData(): void {
    if (!this.selectedFile) {
      this.toastr.error('Please select a file to import');
      return;
    }

    this.productsService.import(this.selectedFile).subscribe({
      next: (res) => {
        const inserted = res.inserted ?? 0;
        const failed = res.failed ?? 0;
        if (inserted > 0) {
          this.toastr.success(`Imported ${inserted} products${failed ? `, ${failed} failed` : ''}`);
        } else {
          this.toastr.warning('No products were imported');
        }

        if (res.errors && res.errors.length) {
          // Show only a summary; detailed errors can be logged to console
          console.warn('Import errors:', res.errors);
          this.toastr.info(`${res.errors.length} rows had errors and were skipped`);
        }

        // Navigate back to products list so new items are visible immediately
        this.router.navigate(['/products']);
      },
      error: (err) => {
        console.error('Import failed:', err);
        const message = err?.error?.message || 'Failed to import products';
        this.toastr.error(message);
      }
    });
  }

  getKeys(): string[] {
    return this.rows[0] ? Object.keys(this.rows[0]) : [];
  }
}

