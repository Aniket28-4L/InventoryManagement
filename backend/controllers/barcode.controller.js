import { generateCode128, generateQr } from '../utils/barcode.js';
import { generateLabelsPdf } from '../utils/pdf.js';
import Product from '../models/Product.js';

export async function generate(req, res, next) {
  try {
    const { type = 'code128', value, productId } = req.body;
    if (!value) return res.status(400).json({ success: false, message: 'Missing value' });
    
    // If productId is provided, get product and use its barcode and PDF URL
    let barcodeValue = value;
    let qrValue = value;
    
    if (productId) {
      try {
        const product = await Product.findById(productId).lean();
        if (product) {
          // Use product's barcode value
          barcodeValue = product.barcode || product.sku || value;
          
          // For QR code, include PDF URL if available
          if (type === 'qr' && product.pdfUrl) {
            // Generate full URL for QR code
            const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            qrValue = `${baseUrl}${product.pdfUrl}`;
          } else {
            qrValue = barcodeValue;
          }
          
          // Update product barcode if not set
          if (!product.barcode) {
            await Product.findByIdAndUpdate(productId, { barcode: String(barcodeValue) }, { new: false });
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      }
    }
    
    const finalValue = type === 'qr' ? qrValue : barcodeValue;
    const buffer = type === 'qr' ? await generateQr(finalValue) : await generateCode128(finalValue);
    
    res.json({ success: true, mime: 'image/png', base64: buffer.toString('base64') });
  } catch (e) { next(e); }
}

export async function printLabels(req, res, next) {
  try {
    const { productIds = [], layout = 'a4' } = req.body;
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const labels = await Promise.all(products.map(async (p) => ({
      name: p.name, sku: p.sku, price: p.price, barcodeBuffer: await generateCode128(p.barcode || p.sku)
    })));
    const pdfBuffer = await generateLabelsPdf(labels, { paper: layout === 'a4' ? 'A4' : 'LETTER', columns: layout === 'a4' ? 3 : 2 });
    res.json({ success: true, mime: 'application/pdf', base64: pdfBuffer.toString('base64') });
  } catch (e) { next(e); }
}

export async function scanBarcode(req, res, next) {
  try {
    const { barcode } = req.query;
    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }
    
    const barcodeStr = String(barcode).trim();
    
    // Search for product by barcode or SKU (main product or within variants)
    let product = await Product.findOne({
      $or: [
        { barcode: barcodeStr },
        { sku: barcodeStr },
        { 'variants.barcode': barcodeStr },
        { 'variants.sku': barcodeStr }
      ]
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .populate('variant', 'name')
    .lean();
    
    // If not found, try case-insensitive search
    if (!product) {
      product = await Product.findOne({
        $or: [
          { barcode: { $regex: new RegExp(`^${barcodeStr}$`, 'i') } },
          { sku: { $regex: new RegExp(`^${barcodeStr}$`, 'i') } },
          { 'variants.barcode': { $regex: new RegExp(`^${barcodeStr}$`, 'i') } },
          { 'variants.sku': { $regex: new RegExp(`^${barcodeStr}$`, 'i') } }
        ]
      })
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('variant', 'name')
      .lean();
    }
    
    // If still not found, try partial match (for SKU-variant patterns like "363824-blue")
    if (!product) {
      // Try extracting base SKU (before any hyphen with variant)
      const baseSku = barcodeStr.split('-')[0];
      if (baseSku && baseSku !== barcodeStr) {
        product = await Product.findOne({
          $or: [
            { sku: baseSku },
            { barcode: baseSku }
          ]
        })
        .populate('category', 'name')
        .populate('brand', 'name')
        .populate('variant', 'name')
        .lean();
      }
    }
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found for this barcode' 
      });
    }
    
    // Find matching variant if scanned code matches a variant
    let matchedVariant = null;
    if (product.variants && Array.isArray(product.variants)) {
      matchedVariant = product.variants.find(v => 
        String(v.barcode || '').toLowerCase() === barcodeStr.toLowerCase() ||
        String(v.sku || '').toLowerCase() === barcodeStr.toLowerCase() ||
        String(v.value || '').toLowerCase() === barcodeStr.split('-').pop()?.toLowerCase()
      );
    }
    
    // Generate PDF URL if not exists
    let pdfUrl = product.pdfUrl;
    if (!pdfUrl) {
      pdfUrl = `/api/products/${product._id}/pdf`;
    }
    
    // Map product data with PDF URL and matched variant
    const productData = {
      id: product._id,
      ...product,
      categoryName: product.category && typeof product.category === 'object' ? product.category.name : null,
      brandName: product.brand && typeof product.brand === 'object' ? product.brand.name : null,
      variantName: product.variant && typeof product.variant === 'object' ? product.variant.name : null,
      pdfUrl,
      matchedVariant: matchedVariant || null,
      scannedCode: barcodeStr
    };
    
    res.json({
      success: true,
      data: productData
    });
  } catch (e) {
    next(e);
  }
}

