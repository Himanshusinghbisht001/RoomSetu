import { Router } from 'express';
import * as sessionController from './session.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

// All session routes require authentication
router.use(requireAuth);

router.get('/', sessionController.getMySessions);
router.delete('/:id', sessionController.revokeSession);

export const sessionRoutes = router;
