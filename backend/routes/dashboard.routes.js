import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { widgets } from '../controllers/dashboard.controller.js';

const router = Router();
router.get('/widgets', auth(true), widgets);

export default router;

