import { Router } from 'express';
import { auth, permit } from '../middlewares/auth.js';
import Category from '../models/Category.js';
import Variant from '../models/Variant.js';
import Store from '../models/Store.js';
import Brand from '../models/Brand.js';

const router = Router();

// Log route registration
console.log('Catalog routes: Registering PUT and DELETE routes for categories, brands, and variants');

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Catalog routes are working' });
});

router.get('/categories', auth(true), async (req, res, next) => {
  try { res.json({ success: true, data: await Category.find().lean() }); } catch (e) { next(e); }
});
router.post('/categories', auth(true), async (req, res, next) => {
  try { res.json({ success: true, data: await Category.create(req.body) }); } catch (e) { next(e); }
});
router.put('/categories/:id', auth(true), async (req, res, next) => {
  try {
    console.log('PUT /api/catalog/categories/:id - ID:', req.params.id, 'Body:', req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) {
      console.log('Category not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    console.log('Category updated successfully:', category._id);
    res.json({ success: true, data: category });
  } catch (e) {
    console.error('Error updating category:', e);
    next(e);
  }
});
router.delete('/categories/:id', auth(true), async (req, res, next) => {
  try {
    console.log('DELETE /api/catalog/categories/:id - ID:', req.params.id);
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      console.log('Category not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    console.log('Category deleted successfully:', category._id);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting category:', e);
    next(e);
  }
});
router.get('/variants', auth(true), async (req, res, next) => {
  try { res.json({ success: true, data: await Variant.find().lean() }); } catch (e) { next(e); }
});

// Stores CRUD
router.get('/stores', auth(true), async (req, res, next) => {
  try {
    const stores = await Store.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: stores });
  } catch (e) { next(e); }
});

router.post('/stores', auth(true), permit('Admin', 'Manager', 'Store Keeper'), async (req, res, next) => {
  try {
    const body = { name: String(req.body.name || '').trim(), code: req.body.code || undefined, isActive: req.body.isActive !== false };
    if (!body.name) return res.status(400).json({ success: false, message: 'Store name is required' });
    const created = await Store.create(body);
    res.json({ success: true, data: created });
  } catch (e) { next(e); }
});

router.put('/stores/:id', auth(true), permit('Admin', 'Manager', 'Store Keeper'), async (req, res, next) => {
  try {
    const body = { name: String(req.body.name || '').trim(), code: req.body.code || undefined, isActive: req.body.isActive !== false };
    const updated = await Store.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Store not found' });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.delete('/stores/:id', auth(true), permit('Admin', 'Manager', 'Store Keeper'), async (req, res, next) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});
router.post('/variants', auth(true), async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ success: false, message: 'Variant name is required' });
    }
    if (typeof body.values === 'string') {
      try { body.values = JSON.parse(body.values); } catch { body.values = [body.values.trim()].filter(Boolean); }
    }
    
    if (Array.isArray(body.values)) {
      body.values = body.values
        .map((v) => (typeof v === 'string' ? v.trim() : (v?.name || v?.code || '').trim()))
        .filter((v) => !!v);
    } else if (body.values && typeof body.values === 'object') {
      
    } else {
      body.values = [];
    }
    let created;
    try {
      created = await Variant.create(body);
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('Cast to embedded failed') || err?.name === 'ObjectParameterError') {
        const arr = Array.isArray(body.values)
          ? body.values
          : (body.values && typeof body.values === 'object')
            ? Object.keys(body.values)
            : [];
        const embedded = arr.map((name, idx) => ({ name, sortOrder: idx }));
        created = await Variant.create({ ...body, values: embedded });
      } else {
        throw err;
      }
    }
    res.json({ success: true, data: created });
  } catch (e) {
    const status = e?.name === 'ValidationError' ? 400 : (e?.code === 11000 ? 400 : 500);
    res.status(status).json({ success: false, message: e?.message || 'Failed to create variant' });
  }
});
router.put('/variants/:id', auth(true), async (req, res, next) => {
  try {
    console.log('PUT /api/catalog/variants/:id - ID:', req.params.id, 'Body:', req.body);
    const body = { ...req.body };
    if (typeof body.values === 'string') {
      try { body.values = JSON.parse(body.values); } catch { body.values = [body.values.trim()].filter(Boolean); }
    }
    if (Array.isArray(body.values)) {
      body.values = body.values
        .map((v) => (typeof v === 'string' ? v.trim() : (v?.name || v?.code || '').trim()))
        .filter((v) => !!v);
    } else if (body.values && typeof body.values === 'object') {
      
    } else {
      body.values = [];
    }
    let variant;
    try {
      variant = await Variant.findByIdAndUpdate(req.params.id, body, { new: true });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('Cast to embedded failed') || err?.name === 'ObjectParameterError') {
        const arr = Array.isArray(body.values)
          ? body.values
          : (body.values && typeof body.values === 'object')
            ? Object.keys(body.values)
            : [];
        const embedded = arr.map((name, idx) => ({ name, sortOrder: idx }));
        variant = await Variant.findByIdAndUpdate(req.params.id, { ...body, values: embedded }, { new: true });
      } else {
        throw err;
      }
    }
    if (!variant) {
      console.log('Variant not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }
    console.log('Variant updated successfully:', variant._id);
    res.json({ success: true, data: variant });
  } catch (e) {
    const status = e?.name === 'ValidationError' ? 400 : (e?.code === 11000 ? 400 : 500);
    res.status(status).json({ success: false, message: e?.message || 'Failed to update variant' });
  }
});
router.delete('/variants/:id', auth(true), async (req, res, next) => {
  try {
    console.log('DELETE /api/catalog/variants/:id - ID:', req.params.id);
    const variant = await Variant.findByIdAndDelete(req.params.id);
    if (!variant) {
      console.log('Variant not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }
    console.log('Variant deleted successfully:', variant._id);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting variant:', e);
    next(e);
  }
});
router.get('/brands', auth(true), async (req, res, next) => {
  try { res.json({ success: true, data: await Brand.find().lean() }); } catch (e) { next(e); }
});
router.post('/brands', auth(true), async (req, res, next) => {
  try { res.json({ success: true, data: await Brand.create(req.body) }); } catch (e) { next(e); }
});
router.put('/brands/:id', auth(true), async (req, res, next) => {
  try {
    console.log('PUT /api/catalog/brands/:id - ID:', req.params.id, 'Body:', req.body);
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) {
      console.log('Brand not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    console.log('Brand updated successfully:', brand._id);
    res.json({ success: true, data: brand });
  } catch (e) {
    console.error('Error updating brand:', e);
    next(e);
  }
});
router.delete('/brands/:id', auth(true), async (req, res, next) => {
  try {
    console.log('DELETE /api/catalog/brands/:id - ID:', req.params.id);
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) {
      console.log('Brand not found with ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    console.log('Brand deleted successfully:', brand._id);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting brand:', e);
    next(e);
  }
});

export default router;

