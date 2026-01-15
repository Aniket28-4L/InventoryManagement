import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Variant from '../models/Variant.js';
import Stock from '../models/Stock.js';
import Supplier from '../models/Supplier.js';
import { parseFileToJson, jsonToWorkbook } from '../utils/csv.js';
import { generateProductPdf } from '../utils/pdf.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PDF_DIR = path.join(__dirname, '../uploads/pdfs');

// Helper to resolve variant IDs to names
async function resolveVariantNames(productOrProducts) {
  const isArray = Array.isArray(productOrProducts);
  const products = isArray ? productOrProducts : [productOrProducts];
  
  // Collect all variant IDs from all products
  const variantIds = new Set();
  products.forEach(p => {
    if (Array.isArray(p.variants)) {
      p.variants.forEach(v => {
        if (v.option && /^[0-9a-fA-F]{24}$/.test(String(v.option))) {
          variantIds.add(String(v.option));
        }
      });
    }
  });
  
  if (variantIds.size > 0) {
    const variants = await Variant.find({ _id: { $in: Array.from(variantIds) } }).lean();
    const variantMap = {};
    variants.forEach(v => variantMap[String(v._id)] = v.name);
    
    products.forEach(p => {
      if (Array.isArray(p.variants)) {
        p.variants = p.variants.map(v => ({
          ...v,
          option: variantMap[String(v.option)] || v.option
        }));
      }
    });
  }
  
  return isArray ? products : products[0];
}

export async function createProduct(req, res, next) {
  try {
    const body = req.body;
    if (req.files?.images) {
      body.images = req.files.images.map((f) => `/uploads/${f.filename}`);
    }
    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch {}
    }
    if (body.variants && typeof body.variants === 'object' && !Array.isArray(body.variants)) {
      body.variants = body.variants;
    }
    if (Array.isArray(body.variants)) {
      body.variants = body.variants
        .map((e) => ({
          option: String(e?.option || body.variant || '').trim(),
          value: String(e?.value || '').trim(),
          qty: Math.max(0, Number(e?.qty ?? 0) || 0),
          sku: e?.sku || undefined,
          barcode: e?.barcode || undefined,
          price: typeof e?.price !== 'undefined' ? Math.max(0, Number(e.price)) : undefined,
          cost: typeof e?.cost !== 'undefined' ? Math.max(0, Number(e.cost)) : undefined,
          images: Array.isArray(e?.images) ? e.images : undefined
        }))
        .filter((e) => !!e.option && !!e.value);
    }
    
    // Validate top-level price and cost
    if (typeof body.price !== 'undefined') body.price = Math.max(0, Number(body.price));
    if (typeof body.cost !== 'undefined') body.cost = Math.max(0, Number(body.cost));

    const product = await Product.create(body);

    // Create initial Stock entries for variants or main product
    /* 
    // FIX: Issue 3 - Do NOT auto-insert variant quantities into warehouse table
    // Warehouse stock should be EMPTY until user clicks "Add Stock"
    try {
      if (Array.isArray(body.variants) && body.variants.length > 0) {
        for (const v of body.variants) {
          if (v.value) {
            await Stock.findOneAndUpdate(
              { product: product._id, variantValue: v.value },
              {
                product: product._id,
                sku: v.sku || product.sku,
                productName: product.name,
                variantValue: v.value,
                qty: v.qty || 0,
                availableQty: v.qty || 0,
                warehouseCode: 'DEFAULT', // Default warehouse
                status: 'available'
              },
              { upsert: true, new: true }
            );
          }
        }
      } else {
        // No variants, create stock for main product
        await Stock.findOneAndUpdate(
          { product: product._id, variantValue: '' },
          {
            product: product._id,
            sku: product.sku,
            productName: product.name,
            variantValue: '',
            qty: product.stock || 0, // Fallback if stock is top-level
            availableQty: product.stock || 0,
            warehouseCode: 'DEFAULT',
            status: 'available'
          },
          { upsert: true, new: true }
        );
      }
    } catch (stockError) {
      console.error('Failed to create initial stock:', stockError);
    }
    */

    // Keep Supplier.products reverse mapping in sync when a supplier is specified
    if (product.supplier && String(product.supplier).trim() !== '') {
      try {
        await Supplier.findByIdAndUpdate(
          product.supplier,
          {
            $addToSet: {
              products: {
                product: product._id,
                sku: product.sku,
                cost: product.cost ?? 0
              }
            }
          }
        );
      } catch (error) {
        console.error('Failed to sync supplier.products on createProduct:', error);
      }
    }

    res.json({ success: true, data: product });
  } catch (e) { next(e); }
}

export async function listProducts(req, res, next) {
  try {
    // One-time data clean-up: remove invalid string supplier values that break ObjectId casting
    try {
      await Product.collection.updateMany(
        {
          $or: [
            { supplier: { $type: 'string' } }, // legacy empty-string values
            { supplier: { $type: 'array' } },  // any array of supplier ids/strings
            { supplier: { $type: 'object' } }  // legacy embedded supplier objects
          ]
        },
        { $unset: { supplier: '' } }
      );
    } catch (cleanupError) {
      console.error('Failed to normalize product.supplier values:', cleanupError);
    }

    const { page = 1, limit = 10, q, category, brand } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { sku: new RegExp(q, 'i') },
        { barcode: new RegExp(q, 'i') }
      ];
    }
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    const total = await Product.countDocuments(filter);
    const data = await Product.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('variant', 'name')
      .populate('supplier', 'name companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Aggregate stock quantities per product so the list shows accurate stock
    const productIds = data.map((item) => item._id);
    const stockByProduct = {};
    if (productIds.length > 0) {
      const stockAgg = await Stock.aggregate([
        { $match: { product: { $in: productIds } } },
        { $group: { _id: '$product', qty: { $sum: '$qty' } } }
      ]);
      for (const s of stockAgg) {
        stockByProduct[String(s._id)] = s.qty || 0;
      }
    }

    const mapped = data.map((item) => ({
        ...item,
        categoryName: item.category && typeof item.category === 'object' ? item.category.name : null,
        category: item.category && typeof item.category === 'object' ? item.category._id : item.category,
        brandName: item.brand && typeof item.brand === 'object' ? item.brand.name : null,
        brand: item.brand && typeof item.brand === 'object' ? item.brand._id : item.brand,
        variantName: item.variant && typeof item.variant === 'object' ? item.variant.name : null,
        variant: item.variant && typeof item.variant === 'object' ? item.variant._id : item.variant,
        supplierName: item.supplier && typeof item.supplier === 'object' ? item.supplier.name : null,
        supplier: item.supplier && typeof item.supplier === 'object' ? item.supplier._id : item.supplier,
        // Use variant qty summation as the source of truth for total stock
        stock: (item.variants && item.variants.length > 0)
          ? item.variants.reduce((acc, v) => acc + (v.qty || 0), 0)
          : (stockByProduct[String(item._id)] || 0)
      }));

    // Fix Issue 1: Resolve variant names in list
    const resolvedMapped = await resolveVariantNames(mapped);

    res.json({ success: true, data: resolvedMapped, total, page: Number(page), limit: Number(limit) });
  } catch (e) { next(e); }
}

// Helper function to generate and save product PDF
async function generateAndSaveProductPdf(product) {
  try {
    // Ensure we work with a plain object and resolve variant names
    let productData = product.toObject ? product.toObject() : { ...product };
    
    if (Array.isArray(productData.variants) && productData.variants.length > 0) {
      const variantIds = productData.variants
        .map(v => v.option)
        .filter(opt => opt && /^[0-9a-fA-F]{24}$/.test(String(opt)));
      
      if (variantIds.length > 0) {
        const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
        const variantMap = {};
        variants.forEach(v => variantMap[String(v._id)] = v.name);
        
        productData.variants = productData.variants.map(v => ({
          ...v,
          option: variantMap[String(v.option)] || v.option
        }));
      }
    }

    // Ensure PDF directory exists
    if (!fs.existsSync(PDF_DIR)) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    }
    
    // Generate PDF buffer
    const pdfBuffer = await generateProductPdf(productData);
    
    // Save PDF to file system
    const filename = `product-${product._id || product.id}.pdf`;
    const filepath = path.join(PDF_DIR, filename);
    fs.writeFileSync(filepath, pdfBuffer);
    
    // Generate URL path
    const pdfUrl = `/api/products/${product._id || product.id}/pdf`;
    
    // Update product with PDF URL
    await Product.findByIdAndUpdate(product._id || product.id, {
      pdfUrl,
      pdfGeneratedAt: new Date()
    });
    
    return { pdfUrl, filepath };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function getProduct(req, res, next) {
  try {
    const p = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('variant', 'name')
      .populate('supplier', 'name companyName')
      .lean();
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    let data = p && {
      ...p,
      categoryName: p.category && typeof p.category === 'object' ? p.category.name : null,
      category: p.category && typeof p.category === 'object' ? p.category._id : p.category,
      brandName: p.brand && typeof p.brand === 'object' ? p.brand.name : null,
      brand: p.brand && typeof p.brand === 'object' ? p.brand._id : p.brand,
      variantName: p.variant && typeof p.variant === 'object' ? p.variant.name : null,
      variant: p.variant && typeof p.variant === 'object' ? p.variant._id : p.variant,
      supplierName: p.supplier && typeof p.supplier === 'object' ? p.supplier.name : null,
      supplier: p.supplier && typeof p.supplier === 'object' ? p.supplier._id : p.supplier
    };

    // Fix Issue 1: Resolve variant names
    if (data) {
      data = await resolveVariantNames(data);
      
      // Fix Issue 2: Calculate Total Stock
      // "Total Stock MUST be calculated as: SUM of ALL variant value quantities"
      data.stock = (data.variants && data.variants.length > 0)
          ? data.variants.reduce((acc, v) => acc + (v.qty || 0), 0)
          : (data.stock || 0);
    }
    
    // Auto-generate PDF if it doesn't exist or is outdated
    if (!data.pdfUrl || !data.pdfGeneratedAt) {
      try {
        const { pdfUrl } = await generateAndSaveProductPdf(data);
        data.pdfUrl = pdfUrl;
      } catch (error) {
        console.error('Failed to auto-generate PDF:', error);
      }
    }
    
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateProduct(req, res, next) {
  try {
    const body = req.body;
    if (req.files?.images) {
      body.images = req.files.images.map((f) => `/uploads/${f.filename}`);
    }
    if (typeof body.variants === 'string') {
      try { body.variants = JSON.parse(body.variants); } catch {}
    }
    if (Array.isArray(body.variants)) {
      body.variants = body.variants
        .map((e) => ({
          option: String(e?.option || body.variant || '').trim(),
          value: String(e?.value || '').trim(),
          qty: Math.max(0, Number(e?.qty ?? 0) || 0),
          sku: e?.sku || undefined,
          barcode: e?.barcode || undefined,
          price: typeof e?.price !== 'undefined' ? Math.max(0, Number(e.price)) : undefined,
          cost: typeof e?.cost !== 'undefined' ? Math.max(0, Number(e.cost)) : undefined,
          images: Array.isArray(e?.images) ? e.images : undefined
        }))
        .filter((e) => !!e.option && !!e.value);
    }
    
    // Validate top-level price and cost
    if (typeof body.price !== 'undefined') body.price = Math.max(0, Number(body.price));
    if (typeof body.cost !== 'undefined') body.cost = Math.max(0, Number(body.cost));

    const existing = await Product.findById(req.params.id).lean();
    const p = await Product.findByIdAndUpdate(req.params.id, body, { new: true });

    // Sync Stock entries on update
    /* 
    // FIX: Issue 2 - Stop auto-creating warehouse stock on product update
    // Warehouse stock should only be created manually via Stock Management
    try {
      if (Array.isArray(body.variants) && body.variants.length > 0) {
        for (const v of body.variants) {
          if (v.value) {
            const filter = { product: p._id, variantValue: v.value };
            const existingStock = await Stock.findOne(filter).lean();
            const newQty = v.qty || 0;
            const reserved = existingStock ? (existingStock.reservedQty || 0) : 0;
            const available = Math.max(0, newQty - reserved);

            const stockData = {
              product: p._id,
              sku: v.sku || p.sku,
              productName: p.name,
              variantValue: v.value,
              qty: newQty,
              availableQty: available,
              warehouseCode: 'DEFAULT',
              status: 'available'
            };

            await Stock.findOneAndUpdate(
              filter,
              { $set: stockData },
              { upsert: true, new: true }
            );
          }
        }
      } else {
        // Handle case where variants might have been removed or it's a simple product
        // Update main product stock
        const filter = { product: p._id, variantValue: '' };
        const existingStock = await Stock.findOne(filter).lean();
        const newQty = p.stock || 0; // Need to ensure 'stock' is in body if it's top-level
        const reserved = existingStock ? (existingStock.reservedQty || 0) : 0;
        const available = Math.max(0, newQty - reserved);

         await Stock.findOneAndUpdate(
          filter,
          {
            $set: {
              product: p._id,
              sku: p.sku,
              productName: p.name,
              variantValue: '',
              qty: newQty,
              availableQty: available,
              warehouseCode: 'DEFAULT',
              status: 'available'
            }
          },
          { upsert: true, new: true }
        );
      }
    } catch (stockError) {
      console.error('Failed to sync stock on update:', stockError);
    }
    */

    // Keep Supplier.products in sync when supplier changes
    if (existing && p) {
      const previousSupplier = existing.supplier && String(existing.supplier).trim() !== '' ? existing.supplier : null;
      const nextSupplier = p.supplier && String(p.supplier).trim() !== '' ? p.supplier : null;

      if (previousSupplier && (!nextSupplier || String(previousSupplier) !== String(nextSupplier))) {
        try {
          await Supplier.updateOne(
            { _id: previousSupplier },
            { $pull: { products: { product: p._id } } }
          );
        } catch (error) {
          console.error('Failed to remove product from previous supplier on updateProduct:', error);
        }
      }

      if (nextSupplier) {
        try {
          await Supplier.findByIdAndUpdate(
            nextSupplier,
            {
              $addToSet: {
                products: {
                  product: p._id,
                  sku: p.sku,
                  cost: p.cost ?? 0
                }
              }
            }
          );
        } catch (error) {
          console.error('Failed to sync product to supplier on updateProduct:', error);
        }
      }
    }

    res.json({ success: true, data: p });
  } catch (e) { next(e); }
}

export async function deleteProduct(req, res, next) {
  try {
    const id = req.params.id;
    await Product.findByIdAndDelete(id);

    // Remove product reference from any suppliers
    try {
      await Supplier.updateMany(
        { 'products.product': id },
        { $pull: { products: { product: id } } }
      );
    } catch (error) {
      console.error('Failed to remove product from suppliers on deleteProduct:', error);
    }

    res.json({ success: true });
  } catch (e) { next(e); }
}

export async function importProducts(req, res, next) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const rows = parseFileToJson(file.buffer) || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No data found in file' });
    }

    const results = {
      inserted: 0,
      failed: 0,
      errors: []
    };

    // Basic validation + per-row insert so we can report errors clearly
    for (let index = 0; index < rows.length; index++) {
      const r = rows[index] || {};
      const rowNumber = index + 2; // assume header at row 1

      // Validate required fields
      if (!r.name || !r.sku) {
        results.failed += 1;
        results.errors.push({
          row: rowNumber,
          sku: r.sku,
          message: 'Missing required fields: name and/or sku'
        });
        continue;
      }

      const doc = {
        name: String(r.name).trim(),
        sku: String(r.sku).trim(),
        barcode: r.barcode ? String(r.barcode).trim() : undefined,
        uom: r.uom ? String(r.uom).trim() : 'pcs',
        cost: Number(r.cost || 0),
        price: Number(r.price || 0),
        description: r.description ? String(r.description).trim() : undefined
      };

      try {
        await Product.create(doc);
        results.inserted += 1;
      } catch (err) {
        results.failed += 1;
        let message = 'Failed to save product';
        if (err && err.code === 11000) {
          message = 'Duplicate SKU or barcode';
        } else if (err && err.message) {
          message = err.message;
        }
        results.errors.push({
          row: rowNumber,
          sku: r.sku,
          message
        });
      }
    }

    res.json({
      success: results.inserted > 0,
      ...results
    });
  } catch (e) {
    next(e);
  }
}

export async function generateProductPdfEndpoint(req, res, next) {
  try {
    console.log('PDF generation endpoint called for product ID:', req.params.id);
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('variant', 'name')
      .populate('supplier', 'name companyName contact')
      .lean();
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const productData = {
      ...product,
      categoryName: product.category && typeof product.category === 'object' ? product.category.name : null,
      brandName: product.brand && typeof product.brand === 'object' ? product.brand.name : null,
      variantName: product.variant && typeof product.variant === 'object' ? product.variant.name : null,
      supplierName: product.supplier && typeof product.supplier === 'object' ? product.supplier.name : null,
      supplierCompanyName: product.supplier && typeof product.supplier === 'object' ? product.supplier.companyName : null,
      supplierContact: product.supplier && typeof product.supplier === 'object' ? product.supplier.contact || {} : {}
    };
    
    const { pdfUrl, filepath } = await generateAndSaveProductPdf(productData);
    
    // Return PDF as download
    const pdfBuffer = fs.readFileSync(filepath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="product-${product._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
}

export async function getProductPdf(req, res, next) {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const filename = `product-${product._id}.pdf`;
    const filepath = path.join(PDF_DIR, filename);
    
    // Generate PDF if it doesn't exist
    if (!fs.existsSync(filepath)) {
      const productData = await Product.findById(req.params.id)
        .populate('category', 'name')
        .populate('brand', 'name')
        .populate('variant', 'name')
        .populate('supplier', 'name companyName contact')
        .lean();
      
      const fullProductData = {
        ...productData,
        categoryName: productData.category && typeof productData.category === 'object' ? productData.category.name : null,
        brandName: productData.brand && typeof productData.brand === 'object' ? productData.brand.name : null,
        variantName: productData.variant && typeof productData.variant === 'object' ? productData.variant.name : null,
        supplierName: productData.supplier && typeof productData.supplier === 'object' ? productData.supplier.name : null,
        supplierCompanyName: productData.supplier && typeof productData.supplier === 'object' ? productData.supplier.companyName : null,
        supplierContact: productData.supplier && typeof productData.supplier === 'object' ? productData.supplier.contact || {} : {}
      };
      
      await generateAndSaveProductPdf(fullProductData);
    }
    
    // Serve PDF
    if (fs.existsSync(filepath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.sendFile(filepath);
    } else {
      res.status(404).json({ success: false, message: 'PDF not found' });
    }
  } catch (e) {
    next(e);
  }
}

export async function exportProducts(req, res, next) {
  try {
    const { q, category, brand } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { sku: new RegExp(q, 'i') },
        { barcode: new RegExp(q, 'i') }
      ];
    }
    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const data = products.map((p) => ({ name: p.name, sku: p.sku, barcode: p.barcode, uom: p.uom, cost: p.cost, price: p.price, description: p.description }));
    const wb = jsonToWorkbook(data);
    const base64 = wb.toString('base64');
    res.json({ success: true, filename: 'products.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64 });
  } catch (e) { next(e); }
}

export async function createCategory(req, res, next) {
  try {
    const c = await Category.create(req.body);
    res.json({ success: true, data: c });
  } catch (e) { next(e); }
}

export async function listCategories(req, res, next) {
  try {
    const list = await Category.find().lean();
    res.json({ success: true, data: list });
  } catch (e) { next(e); }
}

export async function createBrand(req, res, next) {
  try {
    const b = await Brand.create(req.body);
    res.json({ success: true, data: b });
  } catch (e) { next(e); }
}

export async function listBrands(req, res, next) {
  try {
    const list = await Brand.find().lean();
    res.json({ success: true, data: list });
  } catch (e) { next(e); }
}

export async function getProductStock(req, res, next) {
  try {
    const { id } = req.params;
    const stock = await Stock.find({ product: id })
      .populate('warehouse', 'name code')
      .populate('location', 'zone shelf bin')
      .sort({ warehouse: 1 })
      .lean();
    res.json({ success: true, data: stock });
  } catch (e) { next(e); }
}

