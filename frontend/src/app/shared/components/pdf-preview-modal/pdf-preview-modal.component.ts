import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-pdf-preview-modal',
  templateUrl: './pdf-preview-modal.component.html',
  styleUrls: ['./pdf-preview-modal.component.scss']
})
export class PdfPreviewModalComponent {
  @Input() open = false;
  @Input() title = 'Print Preview';
  @Input() filename = 'labels.pdf';
  @Input() paper: 'a4' | 'letter' = 'a4';
  @Output() close = new EventEmitter<void>();

  @ViewChild('content') contentRef!: ElementRef<HTMLDivElement>;

  async download(): Promise<void> {
    if (!this.contentRef) return;
    const canvas = await html2canvas(this.contentRef.nativeElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: this.paper });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
    pdf.save(this.filename);
  }
}

