import express from 'express';
import { auth, permit } from '../middlewares/auth.js';
import {
  createStockTransfer,
  getStockTransfers,
  getStockTransfer,
  approveStockTransfer,
  shipStockTransfer,
  receiveStockTransfer,
  cancelStockTransfer,
  deleteStockTransfer
} from '../controllers/stockTransfer.controller.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateCreateStockTransfer = [
  body('fromWarehouse').isMongoId().withMessage('Invalid source warehouse'),
  body('toWarehouse').optional().isMongoId().withMessage('Invalid destination warehouse'),
  body('toStore').optional().isMongoId().withMessage('Invalid destination store'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Invalid product'),
  body('items.*.sku').isString().withMessage('SKU is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('items.*.variantValue').optional().isString().withMessage('Variant value must be a string')
];

const validateTransferId = [
  param('id').isMongoId().withMessage('Invalid transfer ID')
];

// All stock transfer routes require authentication
router.use(auth());

// Custom validation middleware to ensure either toWarehouse or toStore is provided (but not both)
const validateTransferDestination = async (req, res, next) => {
  const errors = [];
  const { fromWarehouse, toWarehouse, toStore } = req.body;
  
  // Check that exactly one destination is provided
  if (!toWarehouse && !toStore) {
    errors.push({
      type: 'field',
      msg: 'Either destination warehouse or destination store must be specified',
      path: 'toWarehouse',
      location: 'body'
    });
  }
  
  if (toWarehouse && toStore) {
    errors.push({
      type: 'field',
      msg: 'Cannot specify both destination warehouse and destination store',
      path: 'toWarehouse',
      location: 'body'
    });
  }
  
  // If it's a warehouse-to-warehouse transfer, ensure source and destination are different
  if (toWarehouse && fromWarehouse === toWarehouse) {
    errors.push({
      type: 'field',
      msg: 'Source and destination warehouses cannot be the same',
      path: 'fromWarehouse',
      location: 'body'
    });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].msg,
      errors
    });
  }
  
  next();
};

// Routes accessible to users with stock permissions
router.get('/', permit('Admin', 'Manager', 'Staff', 'Store Keeper'), getStockTransfers);
router.get('/:id', permit('Admin', 'Manager', 'Staff', 'Store Keeper'), validateTransferId, getStockTransfer);
router.post('/', permit('Admin', 'Manager', 'Store Keeper'), validateCreateStockTransfer, validateTransferDestination, createStockTransfer);

// Routes requiring higher permissions
router.put('/:id/approve', permit('Admin', 'Manager', 'Store Keeper'), validateTransferId, approveStockTransfer);
router.put('/:id/ship', permit('Admin', 'Manager', 'Store Keeper'), validateTransferId, shipStockTransfer);
router.put('/:id/receive', permit('Admin', 'Manager', 'Store Keeper'), validateTransferId, receiveStockTransfer);
router.put('/:id/cancel', permit('Admin', 'Manager', 'Store Keeper'), validateTransferId, cancelStockTransfer);
router.delete('/:id', permit('Admin', 'Manager'), validateTransferId, deleteStockTransfer);

export default router;