import { Router } from 'express';
import * as feedbackController from './feedback.controller.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';

export const feedbackRoutes = Router();

// Public Route (with optional authentication)
feedbackRoutes.post('/', optionalAuth, feedbackController.createFeedback);
