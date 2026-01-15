import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  searchCustomers,
  exportCustomers,
  bulkUpdateStatus
} from '../controllers/customer.controller.js';
import { auth } from '../middlewares/auth.js';
import { permit } from '../middlewares/auth.js';
import { body } from 'express-validator';

const router = express.Router();

// All customer routes require authentication
router.use(auth());

// Get routes (accessible to all authenticated users)
router.get('/', getCustomers);
router.get('/export', exportCustomers);
router.get('/stats', getCustomerStats);
router.get('/search', searchCustomers);
router.get('/:id', getCustomerById);

// Create customer (admin/manager only)
router.post('/', [
  permit('Admin', 'Manager'),
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('type').optional().isIn(['individual', 'business']).withMessage('Invalid customer type'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('addresses.billing.street').optional().notEmpty().withMessage('Billing street is required if provided'),
  body('addresses.billing.city').optional().notEmpty().withMessage('Billing city is required if provided'),
  body('addresses.billing.state').optional().notEmpty().withMessage('Billing state is required if provided'),
  body('addresses.billing.zipCode').optional().notEmpty().withMessage('Billing zip code is required if provided'),
  body('addresses.shipping.street').optional().notEmpty().withMessage('Shipping street is required if provided'),
  body('addresses.shipping.city').optional().notEmpty().withMessage('Shipping city is required if provided'),
  body('addresses.shipping.state').optional().notEmpty().withMessage('Shipping state is required if provided'),
  body('addresses.shipping.zipCode').optional().notEmpty().withMessage('Shipping zip code is required if provided')
], createCustomer);

// Update customer (admin/manager only)
router.put('/:id', [
  permit('Admin', 'Manager'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('type').optional().isIn(['individual', 'business']).withMessage('Invalid customer type'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
], updateCustomer);

// Delete customer (admin only)
router.delete('/:id', [
  permit('Admin')
], deleteCustomer);

// Bulk operations
router.patch('/bulk/status', [
  permit('Admin', 'Manager'),
  body('customerIds').isArray().withMessage('Customer IDs must be an array'),
  body('customerIds.*').isMongoId().withMessage('Each customer ID must be valid'),
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
], bulkUpdateStatus);

export default router;