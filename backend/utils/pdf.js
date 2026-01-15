import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateProductPdf(product) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  
  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(product.name || 'Product Details', { align: 'center' });
  doc.moveDown();
  
  // Product Information Section
  doc.fontSize(14).font('Helvetica-Bold').text('Product Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  
  const supplierContact = product.supplierContact || {};
  const supplierLineParts = [];
  if (product.supplierName) supplierLineParts.push(product.supplierName);
  if (product.supplierCompanyName) supplierLineParts.push(product.supplierCompanyName);
  const supplierLine = supplierLineParts.join(' - ') || product.supplier?.name || '-';

  let variantDisplay = product.variantName || product.variant?.name || '-';
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const vList = product.variants
      .filter(v => v.option && v.value)
      .map(v => `${v.option}: ${v.value}`);
    if (vList.length > 0) {
      variantDisplay = vList.join(', ');
    }
  }

  const info = [
    ['SKU:', product.sku || '-'],
    ['Barcode:', product.barcode || '-'],
    ['Category:', product.categoryName || product.category?.name || '-'],
    ['Brand:', product.brandName || product.brand?.name || '-'],
    ['Variant:', variantDisplay],
    ['Supplier:', supplierLine],
    ['Supplier Email:', supplierContact.email || product.supplier?.contact?.email || '-'],
    ['Supplier Phone:', supplierContact.phone || product.supplier?.contact?.phone || '-'],
    ['Unit:', product.uom || '-'],
    ['Cost:', typeof product.cost === 'number' ? `KD ${product.cost.toFixed(2)}` : '-'],
    ['Price:', typeof product.price === 'number' ? `KD ${product.price.toFixed(2)}` : '-'],
    ['Status:', product.status || 'active']
  ];
  
  info.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, { continued: false });
  });
  
  doc.moveDown();
  
  // Description
  if (product.description) {
    doc.fontSize(14).font('Helvetica-Bold').text('Description', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(product.description, { align: 'left' });
    doc.moveDown();
  }
  
  // Specifications
  if (product.specifications) {
    doc.fontSize(14).font('Helvetica-Bold').text('Specifications', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    
    const specs = product.specifications;
    if (specs.weight) doc.text(`Weight: ${specs.weight}`);
    if (specs.dimensions) {
      doc.text(`Dimensions: ${specs.dimensions.length || 0} x ${specs.dimensions.width || 0} x ${specs.dimensions.height || 0} ${specs.dimensions.unit || 'cm'}`);
    }
    if (specs.color) doc.text(`Color: ${specs.color}`);
    if (specs.material) doc.text(`Material: ${specs.material}`);
    if (specs.manufacturer) doc.text(`Manufacturer: ${specs.manufacturer}`);
    if (specs.countryOfOrigin) doc.text(`Country of Origin: ${specs.countryOfOrigin}`);
    doc.moveDown();
  }
  
  // Footer
  doc.fontSize(8).fillColor('#666666').text(
    `Generated on: ${new Date().toLocaleString()}`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  );
  
  return new Promise((resolve) => {
    const buffer = [];
    doc.on('data', (d) => buffer.push(d));
    doc.on('end', () => resolve(Buffer.concat(buffer)));
    doc.end();
  });
}

export function generateLabelsPdf(labels = [], options = { paper: 'A4' }) {
  const doc = new PDFDocument({ size: options.paper?.toUpperCase() === 'A4' ? 'A4' : 'LETTER', margin: 20 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => {});

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = options.columns || 3;
  const colWidth = pageWidth / cols;
  let x = doc.page.margins.left, y = doc.page.margins.top;
  let col = 0;

  labels.forEach((label, idx) => {
    doc.rect(x, y, colWidth - 8, 120).stroke('#e5e7eb');
    doc.fontSize(10).text(label.name || '', x + 8, y + 8, { width: colWidth - 24, ellipsis: true });
    doc.fontSize(8).fillColor('#6b7280').text(`${label.sku || ''} • KD ${(label.price ?? 0).toFixed(2)}`, x + 8, y + 24);
    if (label.barcodeBuffer) {
      try {
        doc.image(label.barcodeBuffer, x + 8, y + 40, { width: colWidth - 24, height: 50, align: 'center' });
      } catch {}
    }
    if (label.qrBuffer) {
      try {
        doc.image(label.qrBuffer, x + colWidth - 8 - 52, y + 8, { width: 44, height: 44 });
      } catch {}
    }
    col++;
    if (col >= cols) {
      col = 0; x = doc.page.margins.left; y += 130;
      if (y + 130 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage(); y = doc.page.margins.top;
      }
    } else {
      x += colWidth;
    }
  });

  doc.end();
  return new Promise((resolve) => {
    const buffer = [];
    doc.on('data', (d) => buffer.push(d));
    doc.on('end', () => resolve(Buffer.concat(buffer)));
  });
}

export function generateInvoicePdf(order) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffer = []
  const title = 'Invoice'
  const num = order.orderNumber || ''
  const dateStr = new Date(order.orderDate || Date.now()).toLocaleDateString()
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(12).font('Helvetica').text(`Invoice Number: ${num}`)
  doc.text(`Invoice Date: ${dateStr}`)
  if (order.buyerName) {
    doc.text(`Buyer Name: ${order.buyerName}`)
  }
  doc.moveDown()
  const tableTop = doc.y
  // FIX: Issue 2 - Add Discount column to Invoice
  // Adjusted columns: Description (50), Qty (250), Unit (320), Discount (390), Total (460)
  const colX = [50, 250, 320, 390, 460]
  doc.font('Helvetica-Bold').text('Description', colX[0], tableTop)
  doc.text('Qty', colX[1], tableTop)
  doc.text('Unit Price', colX[2], tableTop)
  doc.text('Discount', colX[3], tableTop)
  doc.text('Line Total', colX[4], tableTop)
  doc.moveDown(0.5)
  doc.font('Helvetica')
  let y = doc.y
  const items = order.items || []
  items.forEach((it) => {
    const qty = Number(it.quantity || 0)
    const unit = Number(it.unitPrice || 0)
    // Fix: Discount is direct amount, not percentage, matching sales controller logic
    const subtotal = unit * qty
    const discount = Number(it.discount || 0)
    const line = Math.max(0, subtotal - discount)
    
    let desc = String(it.productName || '')
    if (it.variant && Array.isArray(it.variant.values) && it.variant.values.length > 0) {
      desc += ` (${it.variant.values.join(', ')})`
    }

    doc.text(desc, colX[0], y, { width: 190 }) // Reduced width to make room
    doc.text(String(qty), colX[1], y)
    doc.text(`KD ${unit.toFixed(2)}`, colX[2], y)
    doc.text(`KD ${discount.toFixed(2)}`, colX[3], y)
    doc.text(`KD ${line.toFixed(2)}`, colX[4], y)
    y += 20
    if (y > doc.page.height - 120) {
      doc.addPage()
      y = 80
      doc.font('Helvetica-Bold').text('Description', colX[0], y)
      doc.text('Qty', colX[1], y)
      doc.text('Unit Price', colX[2], y)
      doc.text('Discount', colX[3], y)
      doc.text('Line Total', colX[4], y)
      doc.font('Helvetica')
      y += 20
    }
  })
  doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke('#e5e7eb')
  const grand = Number(order.total || items.reduce((s, it) => s + Math.max(0, (Number(it.unitPrice || 0) * Number(it.quantity || 0)) - Number(it.discount || 0)), 0))
  doc.font('Helvetica-Bold').text('Grand Total', 390, y + 15)
  doc.text(`KD ${grand.toFixed(2)}`, 460, y + 15)
  doc.on('data', (d) => buffer.push(d))
  doc.on('end', () => {})
  doc.end()
  return new Promise((resolve) => {
    const chunks = []
    doc.on('data', (d) => chunks.push(d))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

