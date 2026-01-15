import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Stock from '../models/Stock.js'
import StockMovement from '../models/StockMovement.js'
import { generateInvoicePdf } from '../utils/pdf.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PDF_DIR = path.join(__dirname, '../uploads/pdfs')

export async function createSale(req, res, next) {
  try {
    const { items, customerId, buyerName } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No sale items provided' })
    }

    const normalizedItems = []
    for (const it of items) {
      const product = await Product.findById(it.productId).lean()
      if (!product) {
        return res.status(400).json({ success: false, message: 'Invalid product in cart' })
      }
      const unitPrice = Number(product.price || 0)
      const qty = Number(it.quantity || 0)
      const discount = Number(it.discount || 0)
      const variantValue = it.variantValue || ''

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid quantity' })
      }
      // ISSUE 4: Prevent negative discount. ISSUE 3: Discount is direct amount.
      if (!Number.isFinite(discount) || discount < 0) {
        return res.status(400).json({ success: false, message: 'Invalid discount amount' })
      }

      // Check stock availability - PRIMARY SOURCE is Product Variant Quantity
      let available = 0;
      let variantStockFound = false;

      // First check if product has variants and we have a selected variant value
      if (product.variants && product.variants.length > 0) {
        if (variantValue) {
          const v = product.variants.find(v => v.value === variantValue);
          if (v) {
            available = v.qty || 0;
            variantStockFound = true;
          }
        } else {
           // If no variant selected but product has variants, 
           // availability depends on specific selection. 
           // But here we are validating line item.
           // If user didn't select variant, FE should block or we assume 0?
           // Or maybe sum all? No, can't sell "any" variant.
           available = 0; 
        }
      } else {
        // No variants, check Warehouse Stock aggregation as fallback or simple product logic?
        // Requirement: "Warehouse stock is NOT the source of truth."
        // "Total stock = sum of all variant value quantities"
        // If simple product, maybe we check Stock collection with empty variant?
        // Or does Product model have a top-level stock?
        // Product schema has `stock` virtual or aggregated? 
        // Product schema has no `stock` field. It relies on Stock collection.
        // Wait, "The quantity entered while creating product variant values is the TRUE and PRIMARY stock."
        // What about non-variant products? They don't have `variants` array entries.
        // In `createProduct`, if no variants, we created a Stock entry with variantValue: ''.
        // So for simple products, we MUST check the Stock collection or a `qty` field on Product if it existed (it doesn't).
        
        // Re-reading Requirement: "Warehouse stock is NOT the source of truth... The quantity entered while creating product variant values is the TRUE and PRIMARY stock."
        // This implies for simple products, we might need a similar "primary" source.
        // But simple products don't have variants.
        // If the user means "Product-level quantity", we should check if there's a field for it.
        // Looking at Product.js schema... `variants: [{ qty: ... }]`.
        // There is NO top-level `qty` field in Product schema shown in search results.
        // Ah, `createProduct` says: `qty: product.stock || 0` for Stock creation.
        // But `product.stock` is not in schema?
        // Let's check Product.js schema again.
        // `images: [{ type: String }], variants: [{...}]`. No top-level stock/qty.
        // So for simple products, the Stock collection IS the only record?
        // OR, did I miss something?
        // The requirement specifically mentions "Product Variant values".
        // Maybe for simple products, the logic remains "Stock collection" BUT we must ensure we don't double count.
        
        // Let's assume for Simple Products, we continue to use Stock aggregation 
        // BUT for Variant Products, we MUST use the `variants.qty`.
        
        const availableAgg = await Stock.aggregate([
          { $match: matchQuery },
          { $group: { _id: '$product', available: { $sum: '$availableQty' } } }
        ])
        available = availableAgg[0]?.available || 0
      }

      if (qty > available) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name} ${variantValue ? '(' + variantValue + ')' : ''}` })
      }

      const lineSubtotal = unitPrice * qty
      // ISSUE 3: Direct deduction
      const lineTotal = Math.max(0, lineSubtotal - discount)

      normalizedItems.push({
        product: product._id,
        sku: product.sku || '',
        productName: product.name || '',
        quantity: qty,
        unit: 'pcs',
        unitPrice: unitPrice,
        discount: discount,
        totalPrice: Number(lineTotal.toFixed(2)),
        // Map variantValue to Order schema structure
        variant: variantValue ? { values: [variantValue] } : undefined
      })
    }

    const subtotal = normalizedItems.reduce((s, x) => s + x.unitPrice * x.quantity, 0)
    // Discount total is sum of direct discounts
    const discountTotal = normalizedItems.reduce((s, x) => s + x.discount, 0)
    const total = normalizedItems.reduce((s, x) => s + x.totalPrice, 0)

    const order = await Order.create({
      type: 'sales',
      status: 'pending',
      customer: customerId || undefined,
      buyerName: buyerName || undefined,
      items: normalizedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountTotal.toFixed(2)),
      tax: 0,
      shipping: 0,
      total: Number(total.toFixed(2)),
      createdBy: req.user?.id,
      lastModifiedBy: req.user?.id
    })

    for (const it of normalizedItems) {
      // DEDUCT STOCK
      // Logic: 
      // 1. Deduct from Product Variant Qty (Primary Source)
      // 2. Also reflect in Warehouse Stock (Secondary Storage) for consistency
      
      // 1. Update Product Variant Qty
      if (it.variant?.values?.[0]) {
        await Product.updateOne(
          { _id: it.product, "variants.value": it.variant.values[0] },
          { $inc: { "variants.$.qty": -it.quantity } }
        );
      } else {
         // Simple product - no variant array to update?
         // If schema doesn't have top-level qty, we rely on Stock.
      }

      // 2. Update Warehouse Stock (Distribution)
      // We need to find which warehouse to deduct from. 
      // Since we don't select warehouse in Sales, we use FIFO or any available?
      // "Warehouse stock is a distribution... Deduct quantity from variant value stock... Add same... Wait."
      // "When a sale happens: Deduct stock ONLY for the selected variant value."
      // "Warehouse stock must NOT affect sales availability."
      // BUT we still need to lower the warehouse counts so they sum up correctly?
      // "Total stock = sum of all variant value quantities".
      // So if we reduce Variant Qty, we MUST reduce Warehouse Stock too, otherwise Sum(Warehouse) > VariantQty.
      
      let remaining = it.quantity
      const stockFilter = { product: it.product }
      if (it.variant?.values?.[0]) {
        stockFilter.variantValue = it.variant.values[0]
      } else {
         stockFilter.variantValue = ''
      }
      
      const stocks = await Stock.find(stockFilter).sort({ availableQty: -1 }).lean()
      
      // If no warehouse stock found (e.g. only in Variant Qty?), we can't deduct from warehouse.
      // But we already deducted from Variant Qty.
      // If we have warehouse stock, we deduct to keep in sync.
      
      for (const st of stocks) {
        if (remaining <= 0) break
        const canDeduct = Math.min(st.availableQty || 0, remaining)
        if (canDeduct > 0) {
          await Stock.updateOne({ _id: st._id }, { $inc: { qty: -canDeduct, availableQty: -canDeduct } })
          await StockMovement.create({
            type: 'OUT',
            product: it.product,
            sku: it.sku,
            productName: it.productName,
            qty: canDeduct,
            fromWarehouse: st.warehouse,
            performedBy: req.user?.id,
            status: 'COMPLETED',
            reference: { type: 'sales_order', number: order.orderNumber, id: order._id }
          })
          remaining -= canDeduct
        }
      }
      // If remaining > 0, it means we sold more than what's in warehouses, 
      // but we validated against Variant Qty.
      // This implies we have "Unallocated" stock (in Variant but not in any Warehouse).
      // This is acceptable per "Warehouse stock = storage allocation only".
    }

    await Order.findByIdAndUpdate(order._id, { status: 'completed', completedDate: new Date() })
    const filename = `invoice-${order.orderNumber}.pdf`
    if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true })
    const pdfBuffer = await generateInvoicePdf({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate || order.createdAt,
      items: normalizedItems,
      total: Number(total.toFixed(2)),
      buyerName: order.buyerName // Pass buyer name to PDF generator
    })
    const filepath = path.join(PDF_DIR, filename)
    fs.writeFileSync(filepath, pdfBuffer)
    const pdfUrl = `/api/sales/${order._id}/pdf`

    res.json({ success: true, data: { id: order._id, orderNumber: order.orderNumber, total: order.total, createdAt: order.createdAt, pdfUrl } })
  } catch (e) { next(e) }
}

export async function listSales(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum
    const q = { type: 'sales', status: 'completed' }
    const total = await Order.countDocuments(q)
    const orders = await Order.find(q).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
    res.json({ success: true, data: orders, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (e) { next(e) }
}

export async function getSale(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).lean()
    if (!order || order.type !== 'sales') {
      return res.status(404).json({ success: false, message: 'Sale not found' })
    }
    res.json({ success: true, data: order })
  } catch (e) { next(e) }
}

export async function getInvoicePdf(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).lean()
    if (!order || order.type !== 'sales') {
      return res.status(404).json({ success: false, message: 'Sale not found' })
    }
    const filename = `invoice-${order.orderNumber}.pdf`
    const filepath = path.join(PDF_DIR, filename)
    if (!fs.existsSync(filepath)) {
      const buffer = await generateInvoicePdf({
        orderNumber: order.orderNumber,
        orderDate: order.orderDate || order.createdAt,
        items: order.items || [],
        total: order.total || 0,
        buyerName: order.buyerName // Pass buyer name to PDF generator
      })
      if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true })
      fs.writeFileSync(filepath, buffer)
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    const pdfBuffer = fs.readFileSync(filepath)
    res.send(pdfBuffer)
  } catch (e) { next(e) }
}

export async function deleteSale(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Sale not found' })
    }
    await Order.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Sale deleted successfully' })
  } catch (e) { next(e) }
}