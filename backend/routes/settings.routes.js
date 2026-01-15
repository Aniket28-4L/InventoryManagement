import express from 'express';
import { auth, permit } from '../middlewares/auth.js';
import {
  getSettings,
  updateSettings,
  getSettingsSection,
  updateSettingsSection,
  resetSettings,
  getSystemInfo
} from '../controllers/settings.controller.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateSettings = [
  body('company.name').optional().isString(),
  body('company.logo').optional().isString(),
  body('company.address').optional().isString(),
  body('company.phone').optional().isString(),
  body('company.email').optional().isEmail(),
  body('company.taxId').optional().isString(),
  body('inventory.lowStockThreshold').optional().isInt({ min: 0 }),
  body('inventory.autoReorder').optional().isBoolean(),
  body('inventory.defaultReorderPoint').optional().isInt({ min: 0 }),
  body('barcode.format').optional().isIn(['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'QR']),
  body('notifications.email.enabled').optional().isBoolean(),
  body('notifications.sms.enabled').optional().isBoolean(),
  body('notifications.push.enabled').optional().isBoolean()
];

// All settings routes require authentication and admin role
router.use(auth());
router.use(permit('Admin'));

// Main settings routes
router.get('/', getSettings);
router.put('/', validateSettings, updateSettings);
router.get('/system-info', getSystemInfo);

// Section-specific routes
router.get('/:section', getSettingsSection);
router.put('/:section', updateSettingsSection);

// Reset settings
router.post('/reset', resetSettings);

export default router;