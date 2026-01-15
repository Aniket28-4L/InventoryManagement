import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

@Component({
  selector: 'app-barcode-preview',
  templateUrl: './barcode-preview.component.html',
  styleUrls: ['./barcode-preview.component.scss']
})
export class BarcodePreviewComponent implements OnChanges, AfterViewInit {
  @Input() type: 'code128' | 'qr' = 'code128';
  @Input() value = '';
  @Input() label?: string;

  @ViewChild('svg', { static: false }) svgRef?: ElementRef<SVGElement>;
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['type']) {
      // Wait for view to update
      setTimeout(() => this.render(), 50);
    }
  }

  ngAfterViewInit(): void {
    if (this.value) {
      setTimeout(() => this.render(), 50);
    }
  }

  async render(): Promise<void> {
    if (!this.value) return;
    
    // Retry mechanism for ViewChild elements
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryRender = () => {
      attempts++;
      
      if (this.type === 'code128' && this.svgRef?.nativeElement) {
        try {
          // Clear previous content
          this.svgRef.nativeElement.innerHTML = '';
          JsBarcode(this.svgRef.nativeElement, this.value, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12
          });
        } catch (e) {
          console.error('Error rendering barcode:', e);
          if (attempts < maxAttempts) {
            setTimeout(tryRender, 100);
          }
        }
      } else if (this.type === 'qr' && this.canvasRef?.nativeElement) {
        QRCode.toCanvas(this.canvasRef.nativeElement, this.value, { width: 256, margin: 2, errorCorrectionLevel: 'M' as any })
          .catch(e => {
            console.error('Error rendering QR code:', e);
            if (attempts < maxAttempts) {
              setTimeout(tryRender, 100);
            }
          });
      } else if (attempts < maxAttempts) {
        // ViewChild not ready yet, retry
        setTimeout(tryRender, 100);
      }
    };
    
    tryRender();
  }
}


