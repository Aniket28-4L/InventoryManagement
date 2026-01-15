import { Router } from 'express'
import { auth, permit } from '../middlewares/auth.js'
import { createSale, listSales, getSale, getInvoicePdf, deleteSale } from '../controllers/sales.controller.js'

const router = Router()

router.post('/', auth(true), permit('Admin', 'Manager', 'Staff', 'Sales'), createSale)
router.get('/', auth(true), listSales)
router.get('/:id', auth(true), getSale)
router.get('/:id/pdf', auth(true), getInvoicePdf)
router.delete('/:id', auth(true), permit('Admin', 'Manager'), deleteSale)

export default router