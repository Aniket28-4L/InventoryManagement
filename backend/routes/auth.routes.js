import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { login, register, me, refresh, logout } from '../controllers/auth.controller.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', auth(false), logout);
router.post('/refresh', refresh);
router.get('/me', auth(true), me);

export default router;

