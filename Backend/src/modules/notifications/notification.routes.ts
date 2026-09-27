import { Router } from 'express';
import * as notificationController from './notification.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.post('/subscribe', notificationController.subscribe);
router.delete('/unsubscribe', notificationController.unsubscribe);

export const notificationRoutes = router;
