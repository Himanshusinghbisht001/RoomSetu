import { Router } from 'express';
import * as reviewController from './review.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { requireRole } from '../../middleware/roleGuard.js';

// Mounted at /api/v1/rooms/:roomId/reviews
export const reviewRoomRoutes = Router({ mergeParams: true });

// Mounted at /api/v1/reviews
export const reviewRoutes = Router();

// --- Room Reviews Routes (/api/v1/rooms/:roomId/reviews) ---

// Publicly readable (guests allowed), but optionalAuth can attach user info if provided
reviewRoomRoutes.get('/', optionalAuth, reviewController.getRoomReviews);

// Summary is public
reviewRoomRoutes.get('/summary', reviewController.getRoomRatingSummary);

// Only seekers can post reviews
reviewRoomRoutes.post(
  '/',
  requireAuth,
  requireRole('seeker'),
  reviewController.createReview
);

// --- Standalone Reviews Routes (/api/v1/reviews/:reviewId) ---

// Updating a review requires authentication
reviewRoutes.patch(
  '/:reviewId',
  requireAuth,
  reviewController.updateReview
);

// Deleting a review requires authentication
reviewRoutes.delete(
  '/:reviewId',
  requireAuth,
  reviewController.deleteReview
);
