import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

// Apply requireAuth middleware to all chat routes
router.use(requireAuth);

/**
 * GET /api/v1/chat/:inquiryId/messages
 * Retrieves messages for a specific inquiry.
 */
router.get('/:inquiryId/messages', chatController.getMessages);

/**
 * POST /api/v1/chat/:inquiryId/messages
 * Sends a new message for a specific inquiry.
 */
router.post('/:inquiryId/messages', chatController.sendMessage);

export { router as chatRoutes };
