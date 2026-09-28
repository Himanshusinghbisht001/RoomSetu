import { Router } from 'express';
import * as authController from './auth.controller.js';

const router = Router();

router.use(authController.authLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export const authRoutes = router;
