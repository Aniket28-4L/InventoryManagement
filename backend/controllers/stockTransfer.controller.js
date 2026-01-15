import StockTransfer from '../models/StockTransfer.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import Location from '../models/Location.js';
import { validationResult } from 'express-validator';

// Create new stock transfer
export const createStockTransfer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: errors.array()[0]?.msg || 'Validation failed',
        errors: errors.array() 
      });
    }

    const { transferNumber, fromWarehouse, toWarehouse, toStore, items, notes } = req.body;

    // Validate warehouses
    const fromWarehouseExists = await Warehouse.findById(fromWarehouse);
    
    if (!fromWarehouseExists) {
      return res.status(400).json({ success: false, message: 'Invalid source warehouse' });
    }
    
    // Check if this is a warehouse-to-store transfer
    if (toStore) {
      // For store transfers, validate store exists
      const Store = (await import('../models/Store.js')).default;
      const toStoreExists = await Store.findById(toStore);
      if (!toStoreExists) {
        return res.status(400).json({ success: false, message: 'Invalid destination store' });
      }
    } else {
      // For warehouse transfers, validate destination warehouse exists
      const toWarehouseExists = await Warehouse.findById(toWarehouse);
      if (!toWarehouseExists) {
        return res.status(400).json({ success: false, message: 'Invalid destination warehouse' });
      }


    }

    // Validate items and check stock availability
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.product}` });
      }

      // Check stock availability - use availableQty first (qty - reservedQty)
      const stockQuery = {
        product: item.product,
        warehouse: fromWarehouse,
        variantValue: item.variantValue || ''
      };
      
      const stock = await Stock.findOne(stockQuery);

      // Calculate available quantity (prioritize availableQty over qty)
      const availableQty = stock ? (stock.availableQty ?? stock.qty ?? 0) : 0;
      
      if (!stock || availableQty < item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient stock for product ${item.sku || product.sku || 'Unknown'}. Available: ${availableQty}, Requested: ${item.quantity}` 
        });
      }

      validatedItems.push({
        product: item.product,
        sku: item.sku,
        name: product.name,
        quantity: item.quantity,
        quantityReceived: 0,
        notes: item.notes || '',
        variantValue: item.variantValue || ''
      });
    }

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Create transfer (transferNumber will be auto-generated if not provided)
    const requestedStatus = req.body.status || 'pending';
    const transfer = new StockTransfer({
      transferNumber: transferNumber || undefined, // Let pre-save hook generate if not provided
      fromWarehouse,
      toWarehouse,
      toStore, // Add toStore if provided
      items: validatedItems,
      notes: notes || '',
      status: requestedStatus,
      requestedBy: req.user.id,
      requestedDate: req.body.requestedDate || new Date()
    });
    
    // If status is completed, set completion date
    if (requestedStatus === 'completed') {
      transfer.completedDate = req.body.completedDate || new Date();
      transfer.receivedBy = req.user.id;
    }

    try {
      await transfer.save();
    } catch (saveError) {
      // Handle duplicate transfer number or validation errors
      if (saveError.code === 11000) {
        // Duplicate key error (transferNumber)
        return res.status(400).json({ 
          success: false, 
          message: 'Transfer number already exists. Please try again.' 
        });
      }
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: saveError.message || 'Validation error',
          errors: Object.values(saveError.errors || {}).map(e => e.message)
        });
      }
      throw saveError; // Re-throw to be caught by outer catch
    }

    // Create stock movement entries for the transfer request
    for (const item of validatedItems) {
      // Create the initial movement record
      let movementStatus = 'PENDING';
      if (transfer.status === 'completed') {
        movementStatus = 'COMPLETED';
        
        // Process immediate stock movement
        try {
          // Build query to find source stock record - be specific to target only the exact stock
          const sourceStockQuery = { 
            product: item.product, 
            warehouse: fromWarehouse,
            variantValue: item.variantValue || ''
          };
          
          // Decrement stock from source warehouse ONLY
          await Stock.updateOne(
            sourceStockQuery,
            { $inc: { qty: -item.quantity, availableQty: -item.quantity } }
          );
          
          let destStockQuery;
          // Handle destination based on whether it's a warehouse or store transfer
          if (toStore) {
            // For store transfer - explicitly set warehouse and location to null
            destStockQuery = { 
              product: item.product, 
              store: toStore,
              warehouse: null,
              location: null,
              variantValue: item.variantValue || ''
            };
            
            // Increment stock at destination store
            await Stock.updateOne(
              destStockQuery,
              { 
                $setOnInsert: {
                  sku: item.sku,
                  productName: (await Product.findById(item.product))?.name || '',
                  warehouseCode: '',
                },
                $inc: { qty: item.quantity, availableQty: item.quantity }
              },
              { upsert: true }
            );
          } else {
            // For warehouse transfer
            destStockQuery = { 
              product: item.product, 
              warehouse: toWarehouse,
              variantValue: item.variantValue || ''
            };
            
            // Increment stock at destination warehouse
            await Stock.updateOne(
              destStockQuery,
              { $inc: { qty: item.quantity, availableQty: item.quantity } },
              { upsert: true }
            );
          }
        } catch (stockError) {
          console.error('Error processing immediate stock movement:', stockError);
          // If stock update fails, revert the transfer status
          transfer.status = 'pending';
          await transfer.save();
          return res.status(500).json({ 
            success: false,
            message: 'Failed to process stock movement: ' + stockError.message 
          });
        }
      }
      
      try {
        const movementData = {
          product: item.product,
          sku: item.sku,
          productName: item.name,
          type: 'TRANSFER',
          qty: item.quantity,
          fromWarehouse,
          reference: {
            type: 'transfer_order',
            number: transfer.transferNumber || transfer._id.toString(),
            id: transfer._id
          },
          performedBy: req.user.id,
          status: movementStatus,
          notes: notes || `Transfer requested for ${item.name}`,
          variantValue: item.variantValue || undefined
        };
        
        // Set destination based on transfer type
        if (toStore) {
          movementData.toStore = toStore;
        } else {
          movementData.toWarehouse = toWarehouse;
        }
        
        await StockMovement.create(movementData);
      } catch (movementError) {
        // If movement creation fails, log but don't fail the entire transfer
        console.error('Failed to create stock movement:', movementError);
        // Continue with other items
      }
    }

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    // Log full error details for debugging
    console.error('Error creating stock transfer:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      errors: error.errors
    });
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Error creating stock transfer';
    let statusCode = 500;
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = error.message || 'Validation error';
    } else if (error.code === 11000) {
      statusCode = 400;
      errorMessage = 'Duplicate entry. Please try again.';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorMessage = 'Invalid data format';
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        error: error.stack,
        errorDetails: {
          name: error.name,
          code: error.code,
          errors: error.errors
        }
      })
    });
  }
};

// Get all stock transfers
export const getStockTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, warehouse, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (warehouse) {
      query.$or = [
        { fromWarehouse: warehouse },
        { toWarehouse: warehouse }
      ];
    }
    if (search) {
      query.$or = [
        { transferNumber: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } }
      ];
    }

    const transfers = await StockTransfer.find(query)
      .populate('fromWarehouse', 'name code')
      .populate('toWarehouse', 'name code')
      .populate('toStore', 'name')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('shippedBy', 'name email')
      .populate('receivedBy', 'name email')
      .populate('items.product', 'name sku images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StockTransfer.countDocuments(query);

    res.json({
      transfers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching stock transfers', 
      error: error.message 
    });
  }
};

// Get single stock transfer
export const getStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('fromWarehouse')
      .populate('toWarehouse')
      .populate('toStore')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('shippedBy', 'name email')
      .populate('receivedBy', 'name email')
      .populate('items.product', 'name sku images');

    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching stock transfer', 
      error: error.message 
    });
  }
};

// Approve stock transfer
export const approveStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({ message: 'Transfer can only be approved when pending' });
    }

    transfer.status = 'approved';
    transfer.approvedBy = req.user.id;
    transfer.approvedDate = new Date();
    transfer.notes = `${transfer.notes || ''}\nApproved: ${req.body.notes || ''}`.trim();

    await transfer.save();

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error approving stock transfer', 
      error: error.message 
    });
  }
};

// Ship stock transfer
export const shipStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    if (transfer.status !== 'approved') {
      return res.status(400).json({ message: 'Transfer must be approved before shipping' });
    }

    // Deduct stock from source warehouse
    for (const item of transfer.items) {
      const stockQuery = {
        product: item.product,
        warehouse: transfer.fromWarehouse,
        sku: item.sku
      };
      
      // If item has variantValue, include it in the query
      if (item.variantValue) {
        stockQuery.variantValue = item.variantValue;
      }
      
      const stock = await Stock.findOne(stockQuery);

      if (stock) {
        stock.qty -= item.quantity;
        stock.availableQty -= item.quantity;
        await stock.save();
      }
    }
    


    transfer.status = 'in_transit';
    transfer.shippedBy = req.user.id;
    transfer.shippedDate = new Date();
    transfer.trackingNumber = req.body.trackingNumber;
    transfer.carrier = req.body.carrier;
    transfer.notes = `${transfer.notes || ''}\nShipped: ${req.body.notes || ''}`.trim();

    await transfer.save();

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error shipping stock transfer', 
      error: error.message 
    });
  }
};

// Receive stock transfer
export const receiveStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    if (transfer.status !== 'in_transit') {
      return res.status(400).json({ message: 'Transfer must be in transit to receive' });
    }

    const { items, notes } = req.body;

    // Update received quantities and add stock to destination warehouse
    for (const receivedItem of items) {
      const transferItem = transfer.items.find(item => 
        item.product.toString() === receivedItem.product && 
        item.sku === receivedItem.sku
      );

      if (transferItem) {
        const receivedQty = receivedItem.receivedQuantity ?? receivedItem.quantityReceived ?? receivedItem.quantity ?? 0;
        transferItem.quantityReceived = receivedQty;

        let stockQuery, destResource;
        // Handle destination based on whether it's a warehouse or store transfer
        if (transfer.toStore) {
          // For store transfer - explicitly set warehouse and location to null
          stockQuery = {
            product: receivedItem.product,
            store: transfer.toStore,
            warehouse: null,
            location: null,
            sku: receivedItem.sku,
            variantValue: receivedItem.variantValue || ''
          };
          
          const Store = (await import('../models/Store.js')).default;
          destResource = await Store.findById(transfer.toStore);
        } else {
          // For warehouse transfer
          stockQuery = {
            product: receivedItem.product,
            warehouse: transfer.toWarehouse,
            sku: receivedItem.sku
          };
          
          // If receivedItem has variantValue, include it in the query
          if (receivedItem.variantValue) {
            stockQuery.variantValue = receivedItem.variantValue;
          }
          
          destResource = await Warehouse.findById(transfer.toWarehouse);
        }
        
        let stock = await Stock.findOne(stockQuery);

        if (stock) {
          stock.qty += receivedQty;
          stock.availableQty += receivedQty;
          await stock.save();
        } else {
          const stockData = {
            product: receivedItem.product,
            sku: receivedItem.sku,
            productName: transferItem.name,
            qty: receivedQty,
            availableQty: receivedQty,
            location: receivedItem.location,
            variantValue: receivedItem.variantValue || ''
          };
          
          // Set destination based on transfer type
          if (transfer.toStore) {
            stockData.store = transfer.toStore;
            stockData.warehouse = null;
            stockData.location = null;
            stockData.warehouseCode = '';
          } else {
            stockData.warehouse = transfer.toWarehouse;
            stockData.warehouseCode = destResource?.code || '';
            stockData.store = null;
          }
          
          await Stock.create(stockData);
        }

        // Create stock movement for received items
        const movementData = {
          product: receivedItem.product,
          sku: receivedItem.sku,
          productName: transferItem.name,
          type: 'IN',
          qty: receivedQty,
          fromWarehouse: transfer.fromWarehouse,
          reference: {
            type: 'transfer_order',
            number: transfer.transferNumber,
            id: transfer._id
          },
          performedBy: req.user.id,
          notes: `Transfer received: ${notes || ''}`
        };
        
        // Set destination based on transfer type
        if (transfer.toStore) {
          movementData.toStore = transfer.toStore;
        } else {
          movementData.toWarehouse = transfer.toWarehouse;
        }
        
        await StockMovement.create(movementData);
      }
    }

    transfer.status = 'completed';
    transfer.receivedBy = req.user.id;
    transfer.receivedDate = new Date();
    transfer.notes = `${transfer.notes || ''}\nReceived: ${notes || ''}`.trim();

    await transfer.save();

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error receiving stock transfer', 
      error: error.message 
    });
  }
};

export const deleteStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Stock transfer not found' });
    }
    await StockTransfer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Stock transfer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel stock transfer
export const cancelStockTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    if (!['pending', 'approved'].includes(transfer.status)) {
      return res.status(400).json({ message: 'Only pending or approved transfers can be cancelled' });
    }

    transfer.status = 'cancelled';
    transfer.notes = `${transfer.notes || ''}\nCancelled: ${req.body.notes || ''}`.trim();

    await transfer.save();

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error cancelling stock transfer', 
      error: error.message 
    });
  }
};