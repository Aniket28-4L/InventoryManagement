import { Router } from 'express';
import { auth, permit } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct, importProducts, exportProducts, createCategory, listCategories, createBrand, listBrands, getProductStock, generateProductPdfEndpoint, getProductPdf } from '../controllers/product.controller.js';

const router = Router();

router.get('/', auth(true), listProducts);
router.post('/', auth(true), permit('Admin', 'Manager'), upload.fields([{ name: 'images' }]), createProduct);
// More specific routes must come before /:id
// Import/Export routes must come before /:id to avoid "import" being treated as an ID
router.post('/import', auth(true), permit('Admin', 'Manager'), upload.single('file'), importProducts);
router.get('/export/xlsx', auth(true), exportProducts);

router.get('/:id/pdf', auth(true), getProductPdf);
router.post('/:id/pdf/generate', auth(true), permit('Admin', 'Manager'), generateProductPdfEndpoint);
router.get('/:id/stock', auth(true), getProductStock);
router.get('/:id', auth(true), getProduct);
router.put('/:id', auth(true), permit('Admin', 'Manager'), upload.fields([{ name: 'images' }]), updateProduct);
router.delete('/:id', auth(true), permit('Admin', 'Manager'), deleteProduct);

router.get('/catalog/categories', auth(true), listCategories);
router.post('/catalog/categories', auth(true), permit('Admin', 'Manager'), createCategory);
router.get('/catalog/brands', auth(true), listBrands);
router.post('/catalog/brands', auth(true), permit('Admin', 'Manager'), createBrand);

export default router;

