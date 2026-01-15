import Warehouse from '../models/Warehouse.js';
import Location from '../models/Location.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';

export async function listWarehouses(req, res, next) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await Warehouse.countDocuments(query);
    
    // Fetch paginated warehouses
    const warehouses = await Warehouse.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const pages = Math.ceil(total / limitNum);
    
    res.json({ 
      success: true, 
      data: {
        warehouses,
        page: pageNum,
        total,
        pages
      }
    });
  } catch (e) { next(e); }
}

export async function getWarehouse(req, res, next) {
  try {
    const warehouse = await Warehouse.findById(req.params.id).lean();
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }
    res.json({ success: true, data: warehouse });
  } catch (e) { next(e); }
}

export async function createWarehouse(req, res, next) {
  try {
    const { name, code } = req.body;
    
    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and code are required' 
      });
    }
    
    // Check if code already exists
    const exists = await Warehouse.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Warehouse code already exists' 
      });
    }
    
    // Create warehouse
    const warehouse = await Warehouse.create({ 
      ...req.body,
      code: code.toUpperCase() // Normalize code to uppercase
    });
    
    res.json({ success: true, data: warehouse });
  } catch (e) {
    // Handle Mongoose validation errors
    if (e.name === 'ValidationError') {
      const errors = Object.values(e.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: errors.join(', ') 
      });
    }
    // Handle duplicate key error (unique constraint)
    if (e.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Warehouse code already exists' 
      });
    }
    // Pass other errors to error handler
    next(e);
  }
}

export async function updateWarehouse(req, res, next) {
  try { res.json({ success: true, data: await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (e) { next(e); }
}

export async function deleteWarehouse(req, res, next) {
  try {
    const warehouse = await Warehouse.findByIdAndDelete(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }
    // Also delete associated locations
    await Location.deleteMany({ warehouse: req.params.id });
    res.json({ success: true });
  } catch (e) { next(e); }
}

export async function listLocations(req, res, next) {
  try { res.json({ success: true, data: await Location.find({ warehouse: req.params.warehouseId }).lean() }); } catch (e) { next(e); }
}

export async function addLocation(req, res, next) {
  try {
    const { warehouseId } = req.params;
    const { zone, shelf, bin, aisle } = req.body;
    const warehouse = await Warehouse.findById(warehouseId).lean();
    if (!warehouse) {
      return res.status(400).json({ success: false, message: 'Warehouse not found' });
    }

    const whCode = (warehouse.code || '').toUpperCase();
    const zoneCode = String(zone || '').toUpperCase();
    const shelfCode = String(shelf || '').toUpperCase();
    const binCode = String(bin || '').toUpperCase();
    if (!zoneCode || !shelfCode || !binCode) {
      return res.status(400).json({ success: false, message: 'zone, shelf and bin are required' });
    }

    const code = [whCode, zoneCode, shelfCode, binCode].filter(Boolean).join('-');

    const loc = await Location.create({ 
      warehouse: warehouseId, 
      warehouseCode: whCode,
      code,
      zone: zoneCode,
      aisle: aisle || '',
      shelf: shelfCode,
      bin: binCode 
    });
    res.json({ success: true, data: loc });
  } catch (e) { next(e); }
}

export async function stockIn(req, res, next) {
  try {
    const { productId, warehouseId, locationId = null, qty, variantValue = '' } = req.body;
    const amount = parsePositiveNumber(qty);
    const product = await Product.findById(productId);
    
    // Check if product has variants and validate variantValue
    let isVariant = false;
    if (product.variants && product.variants.length > 0 && variantValue) {
      const v = product.variants.find(v => v.value === variantValue);
      if (v) {
        isVariant = true;
        // Verify we have enough "unallocated" stock or allow moving?
        // Requirement: "The selected quantity must be: MOVED from actual variant stock, Stored inside the warehouse"
        // "Total stock = sum of all variant value quantities"
        // "Warehouse stock must NOT create new stock."
        
        // This implies:
        // 1. We should NOT increase Product.variants[].qty here.
        // 2. We are just "placing" existing stock into a warehouse.
        // BUT wait, `stockIn` usually means "New Stock Arrival".
        // If the user meant "Add Stock" on Product page adds to Warehouse...
        // "When adding stock to a warehouse... The selected quantity must be: MOVED from actual variant stock... Warehouse stock must NOT create new stock."
        
        // This phrasing is tricky. "MOVED from actual variant stock" implies the stock already exists in the Variant Qty?
        // OR does it mean "When I add 5 to warehouse, I am assigning 5 of the Product's total stock to this warehouse"?
        // AND "Total stock = sum of all variant value quantities".
        // This suggests: Variant Qty IS the total. Warehouse Stock IS the distribution.
        // So if I "Stock In" (Add Stock), I should:
        // A. Increase Variant Qty (Total Stock increases)
        // B. Increase Warehouse Stock (Distribution increases)
        //
        // BUT the user said: "Warehouse stock must NOT create new stock."
        // And "MOVED from actual variant stock".
        // This sounds like:
        // 1. You define Qty=10 in Product Form (Variant Qty = 10, Total = 10, Unallocated = 10).
        // 2. You go to Stock Page, Add 5 to Warehouse A.
        // 3. Result: Variant Qty = 10 (unchanged total), Warehouse A = 5, Unallocated = 5.
        //
        // IF this is the case, `stockIn` should NOT increase Variant Qty?
        // BUT if I add stock that *wasn't* in the product form?
        // "The quantity entered while creating product variant values is the TRUE and PRIMARY stock."
        // So `stockIn` is strictly "Allocation"?
        
        // Let's assume `stockIn` in this context (triggered from "Add Stock" modal on Product Page) is treated as Allocation if the stock already exists?
        // Or does "Add Stock" mean "New Shipment"?
        // The modal title is "Add Stock".
        // If I receive a new shipment of 5 units, I want Total to be +5.
        // If I follow user instructions strictly: "Warehouse stock is a distribution... Total stock = sum of all variant value quantities".
        // If I add 5 to Warehouse, I MUST add 5 to Variant Qty to keep "Total = Sum(Variant Qty)"?
        // NO, "Total stock = sum of all variant value quantities".
        // If I have Variant Qty = 10. Warehouse A = 5.
        // Total is 10.
        // If I add 5 to Warehouse B.
        // Warehouse A = 5, Warehouse B = 5. Total Distributed = 10. Variant Qty = 10.
        // If I add another 5 to Warehouse A?
        // Warehouse A = 10, Warehouse B = 5. Total Distributed = 15.
        // But Variant Qty is 10? Mismatch!
        
        // User said: "Warehouse stock is a distribution, not inventory creation".
        // This strongly implies: You CANNOT add stock via Warehouse if you haven't added it to Variant first?
        // OR, "Add Stock" on product page should update Variant Qty?
        // "When adding stock to a warehouse... The selected quantity must be: MOVED from actual variant stock"
        // This confirms: The stock MUST ALREADY EXIST in Variant Qty.
        // So `stockIn` is effectively "Allocating" existing variant stock to a warehouse.
        // It should NOT increase Variant Qty.
        
        // Check if we have enough unallocated stock?
        // Unallocated = Variant Qty - Sum(All Warehouses for this variant).
        // If Unallocated < qty, we should probably ERROR or Warn?
        // "Prevent selling more than available...".
        // User didn't say "Prevent allocating more than available", but it implies it.
        // However, to be safe and avoid blocking "Add Stock" if the user intention IS to increase total:
        // The user said "The quantity entered while creating product variant values is the TRUE and PRIMARY stock."
        // So if they want to add new stock, they should edit the Product Variant?
        // "Current Problem... When adding stock from the Product page... Warehouse stock is currently treated as 'actual stock', which is incorrect."
        
        // CONCLUSION: `stockIn` (Allocation) logic:
        // 1. Do NOT increase Product Variant Qty.
        // 2. Increase Warehouse Stock.
        // 3. (Optional) Check limit?
        // Let's just implement 1 & 2 to satisfy "Warehouse stock must NOT create new stock."
      }
    } else {
      // Simple product logic?
      // If product has no variants, we rely on Stock collection?
      // Or does simple product also have a "Total Qty" somewhere?
      // As analyzed before, Simple Product has no top-level qty field.
      // So for Simple Product, Stock collection IS the record.
      // So `stockIn` MUST increase qty for Simple Product?
      // "Warehouse stock is NOT the source of truth" might strictly apply to Variants?
      // "Variant value quantity = actual stock".
      // Let's assume for Simple Product, we still increase Stock qty because there's no other place.
      // BUT we must be careful not to break the "Variant" logic.
    }

    // However, `incrementStock` increments `Stock` collection qty.
    // If `Stock` collection is just "Warehouse Distribution", that's fine.
    // We just don't touch `Product.variants.qty`.
    
    // Validation: when product has variants and a variantValue is provided, do not exceed total variant qty
    if (Array.isArray(product?.variants) && product.variants.length > 0 && variantValue) {
      const v = product.variants.find(v => String(v.value) === String(variantValue));
      const variantQty = Number(v?.qty || 0);
      const agg = await Stock.aggregate([
        { $match: { product: product._id, variantValue: String(variantValue) } },
        { $group: { _id: null, qty: { $sum: '$qty' } } }
      ]);
      const allocated = Number((agg[0]?.qty) || 0);
      const proposedTotal = allocated + amount;
      if (proposedTotal > variantQty) {
        const remaining = Math.max(0, variantQty - allocated);
        return res.status(400).json({
          success: false,
          message: `Quantity exceeds variant stock. Remaining for ${variantValue}: ${remaining}`
        });
      }
    }

    const stock = await incrementStock(productId, warehouseId, locationId, amount, variantValue);
    
    // We do NOT update Product.variants.qty here.
    
    await StockMovement.create({
      type: 'IN',
      product: productId,
      sku: product?.sku || '',
      productName: product?.name || '',
      qty: amount,
      toWarehouse: warehouseId,
      performedBy: req.user?.id,
      status: 'COMPLETED'
    });
    res.json({ success: true, data: stock });
  } catch (e) { next(e); }
}

export async function stockOut(req, res, next) {
  try {
    const { productId, warehouseId, locationId = null, qty, variantValue = '' } = req.body;
    const amount = parsePositiveNumber(qty);
    const stock = await Stock.findOne({ product: productId, warehouse: warehouseId, location: locationId ?? null, variantValue: variantValue || '' });
    if (!stock || stock.qty < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient stock to fulfill request' });
    }
    const updated = await incrementStock(productId, warehouseId, locationId, -amount, variantValue);
    const product = await Product.findById(productId);
    await StockMovement.create({
      type: 'OUT',
      product: productId,
      sku: product?.sku || '',
      productName: product?.name || '',
      qty: amount,
      fromWarehouse: warehouseId,
      performedBy: req.user?.id,
      status: 'COMPLETED'
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

export async function stockAdjust(req, res, next) {
  try {
    const { productId, warehouseId, locationId = null, qty, variantValue = '' } = req.body;
    const target = parseNonNegativeNumber(qty);
    const filter = { product: productId, warehouse: warehouseId, location: locationId ?? null, variantValue: variantValue || '' };
    const currentDoc = await Stock.findOne(filter);
    const currentQty = currentDoc?.qty ?? 0;
    const diff = target - currentQty;

    const product = await Product.findById(productId);
    const warehouse = await Warehouse.findById(warehouseId);
    
    if (!product) return res.status(400).json({ success: false, message: 'Product not found' });
    if (!warehouse) return res.status(400).json({ success: false, message: 'Warehouse not found' });

    const reservedQty = currentDoc?.reservedQty || 0;
    const availableQty = Math.max(0, target - reservedQty);

    // Validation: ensure sum of all allocations for this variant does not exceed variant qty
    if (Array.isArray(product?.variants) && product.variants.length > 0 && (variantValue || '')) {
      const v = product.variants.find(v => String(v.value) === String(variantValue || ''));
      const variantQty = Number(v?.qty || 0);
      const agg = await Stock.aggregate([
        { $match: { product: product._id, variantValue: String(variantValue || '') } },
        { $group: { _id: null, qty: { $sum: '$qty' } } }
      ]);
      const totalAllocated = Number((agg[0]?.qty) || 0);
      const otherAllocated = totalAllocated - Number(currentQty || 0);
      const proposedTotal = otherAllocated + target;
      if (proposedTotal > variantQty) {
        const remaining = Math.max(0, variantQty - otherAllocated);
        return res.status(400).json({
          success: false,
          message: `Quantity exceeds variant stock. Remaining for ${variantValue || ''}: ${remaining}`
        });
      }
    }

    const updated = await Stock.findOneAndUpdate(
      filter,
      { 
        $set: { 
          qty: target, 
          location: locationId ?? null,
          sku: resolveSkuForVariant(product, variantValue),
          productName: product.name,
          warehouseCode: warehouse.code,
          variantValue: variantValue || '',
          availableQty: availableQty
        } 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (diff !== 0) {
      await StockMovement.create({
        type: 'ADJUST',
        product: productId,
        sku: product?.sku || '',
        productName: product?.name || '',
        qty: Math.abs(diff),
        fromWarehouse: diff < 0 ? warehouseId : undefined,
        toWarehouse: diff > 0 ? warehouseId : undefined,
        performedBy: req.user?.id,
        status: 'COMPLETED'
      });
    }

    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

export async function stockErase(req, res, next) {
  try {
    const { productId, warehouseId, locationId = null, variantValue = '' } = req.body;
    if (!productId || !warehouseId) {
      return res.status(400).json({ success: false, message: 'productId and warehouseId are required' });
    }
    const filter = { 
      product: productId, 
      warehouse: warehouseId, 
      location: locationId ?? null, 
      variantValue: variantValue || '' 
    };
    const existing = await Stock.findOne(filter);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Stock entry not found' });
    }
    await Stock.deleteOne({ _id: existing._id });
    res.json({ success: true });
  } catch (e) { next(e); }
}

export async function stockStatus(req, res, next) {
  try {
    const { warehouseId } = req.params;
    const list = await Stock.find({ warehouse: warehouseId }).populate('product', 'name sku').lean();
    res.json({ success: true, data: list });
  } catch (e) { next(e); }
}

export async function stockTransfer(req, res, next) {
  try {
    const { productId, fromWarehouse, toWarehouse, qty, variantValue } = req.body;
    
    // Build query to find stock record
    const stockQuery = { product: productId, warehouse: fromWarehouse };
    if (variantValue) {
      stockQuery.variantValue = variantValue;
    }
    
    // decrement from
    await Stock.updateOne(
      stockQuery, 
      { $inc: { qty: -Math.abs(qty), availableQty: -Math.abs(qty) } }, 
      { upsert: true }
    );
    
    // in-transit log
    const product = await Product.findById(productId);
    const mov = await StockMovement.create({ 
      type: 'TRANSFER', 
      product: productId, 
      sku: product?.sku || '',
      productName: product?.name || '',
      qty, 
      fromWarehouse, 
      toWarehouse, 
      performedBy: req.user.id, 
      status: 'COMPLETED',
      variantValue: variantValue || undefined
    });
    
    // Build query for destination stock record
    const destStockQuery = { product: productId, warehouse: toWarehouse };
    if (variantValue) {
      destStockQuery.variantValue = variantValue;
    }
    
    // increment to
    await Stock.updateOne(
      destStockQuery, 
      { $inc: { qty: Math.abs(qty), availableQty: Math.abs(qty) } }, 
      { upsert: true }
    );
    
    res.json({ success: true, data: { transferId: mov._id } });
  } catch (e) { next(e); }
}

export async function stockTransferToStore(req, res, next) {
  try {
    const { productId, fromWarehouse, storeId, qty, variantValue } = req.body;
    const amount = parsePositiveNumber(qty);
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
    
    // Build query to find source stock record - be specific to target only the exact stock
    const sourceStockQuery = { 
      product: productId, 
      warehouse: fromWarehouse,
      variantValue: variantValue || ''
    };
    
    // Check if sufficient stock exists at source warehouse
    const sourceStock = await Stock.findOne(sourceStockQuery);
    const availableQty = sourceStock ? (sourceStock.availableQty ?? sourceStock.qty ?? 0) : 0;
    
    if (!sourceStock || availableQty < amount) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock at source warehouse. Available: ${availableQty}, Requested: ${amount}` 
      });
    }

    // Decrement stock from source warehouse ONLY
    await Stock.updateOne(sourceStockQuery, { $inc: { qty: -amount, availableQty: -amount } });

    // Build query for destination stock record - explicitly set warehouse and location to null
    const destStockQuery = { 
      product: productId, 
      store: storeId,
      warehouse: null,
      location: null,
      variantValue: variantValue || ''
    };

    await Stock.updateOne(
      destStockQuery,
      {
        $setOnInsert: {
          sku: product?.sku || '',
          productName: product?.name || '',
          warehouseCode: '',
        },
        $inc: { qty: amount, availableQty: amount }
      },
      { upsert: true }
    );

    await StockMovement.create({
      type: 'TRANSFER',
      product: productId,
      sku: product?.sku || '',
      productName: product?.name || '',
      qty: amount,
      fromWarehouse,
      toStore: storeId,
      performedBy: req.user.id,
      status: 'COMPLETED',
      variantValue: variantValue || undefined
    });

    res.json({ success: true, data: { productId, fromWarehouse, storeId, qty: amount, variantValue: variantValue || undefined } });
  } catch (e) { next(e); }
}

export async function movementLogs(req, res, next) {
  try {
    const logs = await StockMovement.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, data: logs });
  } catch (e) { next(e); }
}

function parsePositiveNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) throw Object.assign(new Error('Quantity must be greater than 0'), { status: 400 });
  return num;
}

function parseNonNegativeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) throw Object.assign(new Error('Quantity must be zero or greater'), { status: 400 });
  return num;
}

async function incrementStock(productId, warehouseId, locationId, delta) {
  const args = Array.from(arguments);
  const variantValue = args.length >= 5 ? (args[4] || '') : '';
  const filter = { product: productId, warehouse: warehouseId, location: locationId ?? null, variantValue: variantValue || '' };
  const product = await Product.findById(productId);
  const warehouse = await Warehouse.findById(warehouseId);
  
  if (!product) throw new Error('Product not found');
  if (!warehouse) throw new Error('Warehouse not found');
  
  const currentStock = await Stock.findOne(filter);
  const newQty = (currentStock?.qty || 0) + delta;
  const availableQty = Math.max(0, newQty - (currentStock?.reservedQty || 0));
  
  const update = {
    $inc: { qty: delta },
    $set: { 
      location: locationId ?? null,
      sku: resolveSkuForVariant(product, variantValue),
      productName: product.name,
      warehouseCode: warehouse.code,
      variantValue: variantValue || '',
      availableQty: availableQty
    }
  };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  const updated = await Stock.findOneAndUpdate(filter, update, options);
  if (!updated) throw new Error('Failed to update stock');
  return updated.toObject ? updated.toObject() : updated;
}

function resolveSkuForVariant(product, variantValue) {
  if (!variantValue) return product?.sku || '';
  const list = Array.isArray(product?.variants) ? product.variants : [];
  const match = list.find((e) => String(e?.value || '') === String(variantValue || ''));
  return match?.sku || product?.sku || '';
}

