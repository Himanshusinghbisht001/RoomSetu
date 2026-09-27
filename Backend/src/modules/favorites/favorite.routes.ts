import { Router } from 'express';
import * as favoriteController from './favorite.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/roleGuard.js';

// Mounted at /api/v1/favorites
export const favoriteRoutes = Router();

// GET /api/v1/favorites — list authenticated seeker's favorites
favoriteRoutes.get(
  '/',
  requireAuth,
  requireRole('seeker'),
  favoriteController.getFavorites,
);

// GET /api/v1/favorites/check/:roomId — check if a room is favorited
favoriteRoutes.get(
  '/check/:roomId',
  requireAuth,
  requireRole('seeker'),
  favoriteController.checkFavorite,
);

// POST /api/v1/favorites/:roomId — add a room to favorites
favoriteRoutes.post(
  '/:roomId',
  requireAuth,
  requireRole('seeker'),
  favoriteController.addFavorite,
);

// DELETE /api/v1/favorites/:roomId — remove a room from favorites
favoriteRoutes.delete(
  '/:roomId',
  requireAuth,
  requireRole('seeker'),
  favoriteController.removeFavorite,
);
