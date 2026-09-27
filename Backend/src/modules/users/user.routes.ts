import { Router } from 'express';
import * as userController from './user.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

// Protect all user routes
router.use(requireAuth);

router.get('/me', userController.getMe);
router.patch('/profile', userController.updateProfile);
router.patch('/password', userController.changePassword);
router.get('/me/export', userController.exportMe);
router.delete('/me', userController.deleteMe);

export const userRoutes = router;
