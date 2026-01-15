import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addProductToSupplier,
  removeProductFromSupplier,
  getSupplierPerformance,
  exportSuppliers
} from '../controllers/supplier.controller.js';
import { auth } from '../middlewares/auth.js';
import { permit } from '../middlewares/auth.js';
import pkg from 'express-validator';
const { body } = pkg;

const router = express.Router();

// All supplier routes require authentication
router.use(auth());

// Get routes (accessible to all authenticated users)
router.get('/', getSuppliers);
router.get('/export', exportSuppliers);
router.get('/:id', getSupplierById);
router.get('/:id/performance', getSupplierPerformance);

// Create supplier (admin/manager only)
router.post('/', [
  permit('Admin', 'Manager'),
  body('name').notEmpty().withMessage('Name is required'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('code').optional(),
  body('contact.email').optional({ checkFalsy: true, nullable: true }),
  body('contact.phone').optional({ checkFalsy: true, nullable: true }).custom((value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) return true;
    // Basic phone validation - allow various formats
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (typeof value === 'string' && !phoneRegex.test(value)) {
      throw new Error('Invalid phone number format');
    }
    return true;
  }),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  body('performance.rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], createSupplier);

// Update supplier (admin/manager only)
router.put('/:id', [
  permit('Admin', 'Manager'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('companyName').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('contact.email').optional({ checkFalsy: true, nullable: true }),
  body('contact.phone').optional({ checkFalsy: true, nullable: true }).custom((value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) return true;
    // Basic phone validation - allow various formats
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (typeof value === 'string' && !phoneRegex.test(value)) {
      throw new Error('Invalid phone number format');
    }
    return true;
  }),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  body('performance.rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], updateSupplier);

// Delete supplier (admin only)
router.delete('/:id', [
  permit('Admin')
], deleteSupplier);

// Product-supplier relationships
router.post('/:supplierId/products/:productId', [
  permit('Admin', 'Manager')
], addProductToSupplier);

router.delete('/:supplierId/products/:productId', [
  permit('Admin', 'Manager')
], removeProductFromSupplier);

export default router;