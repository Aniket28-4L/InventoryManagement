import { Router } from 'express';
import { auth, permit } from '../middlewares/auth.js';
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouse,
  listLocations,
  addLocation,
  stockStatus,
  stockTransfer,
  movementLogs,
  stockIn,
  stockOut,
  stockAdjust,
  stockErase,
  stockTransferToStore
} from '../controllers/warehouse.controller.js';

const router = Router();

// Static routes first (before parameterized routes)
router.get('/', auth(true), listWarehouses);
router.post('/', auth(true), permit('Admin', 'Manager', 'Store Keeper'), createWarehouse);
router.get('/new', auth(true), (req, res) => {
  res.json({ success: true, data: { name: '', code: '', address: {}, contact: {}, isActive: true, notes: '' } });
});
router.get('/logs', auth(true), movementLogs);
router.post('/stock/in', auth(true), permit('Admin', 'Manager', 'Staff', 'Store Keeper'), stockIn);
router.post('/stock/out', auth(true), permit('Admin', 'Manager', 'Staff', 'Store Keeper'), stockOut);
router.post('/stock/adjust', auth(true), permit('Admin', 'Manager', 'Store Keeper'), stockAdjust);
router.post('/stock/erase', auth(true), permit('Admin', 'Manager', 'Store Keeper'), stockErase);
router.post('/transfer', auth(true), permit('Admin', 'Manager', 'Staff', 'Store Keeper'), stockTransfer);
router.post('/stock/transfer-to-store', auth(true), permit('Admin', 'Manager', 'Staff', 'Store Keeper'), stockTransferToStore);

// Parameterized routes last
router.get('/:id', auth(true), getWarehouse);
router.put('/:id', auth(true), permit('Admin', 'Manager', 'Store Keeper'), updateWarehouse);
router.delete('/:id', auth(true), permit('Admin', 'Manager', 'Store Keeper'), deleteWarehouse);
router.get('/:warehouseId/locations', auth(true), listLocations);
router.post('/:warehouseId/locations', auth(true), permit('Admin', 'Manager', 'Store Keeper'), addLocation);
router.get('/:warehouseId/stock', auth(true), stockStatus);

export default router;
