import express from 'express';
import { 
  generateStockLevelReport, 
  generateStockMovementReport, 
  generateLowStockReport, 
  generateWarehouseSummaryReport, 
  generateUserActivityReport,
  saveReport,
  getSavedReports,
  deleteReport,
  stockReport,
  warehouseReport,
  movementReport,
  lowStockReport,
  activityLogs,
  exportStockReport
} from '../controllers/report.controller.js';
import { auth } from '../middlewares/auth.js';
import { permit } from '../middlewares/auth.js';
import { body } from 'express-validator';

const router = express.Router();

// All report routes require authentication
router.use(auth());

// Legacy routes (backward compatibility)
router.get('/stock', stockReport);
router.get('/stock/export', exportStockReport);
router.get('/warehouse', generateWarehouseSummaryReport);
router.get('/movement', generateStockMovementReport);
router.get('/low-stock', generateLowStockReport);
router.get('/activity', activityLogs);
router.get('/activity-logs', activityLogs);

// New comprehensive report routes
router.get('/stock-level', generateStockLevelReport);
router.get('/stock-movement', generateStockMovementReport);
router.get('/low-stock-items', generateLowStockReport);
router.get('/warehouse-summary', generateWarehouseSummaryReport);
router.get('/user-activity', generateUserActivityReport);

// Saved reports management
router.post('/save', [
  permit('Admin', 'Manager'),
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn([
    'stock_level', 'stock_movement', 'low_stock', 'warehouse_summary', 
    'user_activity', 'custom'
  ]).withMessage('Invalid report type'),
  body('filters').optional().isObject(),
  body('config').optional().isObject()
], saveReport);

router.get('/saved', getSavedReports);

router.delete('/saved/:id', [
  permit('Admin', 'Manager')
], deleteReport);

export default router;

