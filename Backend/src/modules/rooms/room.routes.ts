import { Router } from 'express';
import * as roomController from './room.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/roleGuard.js';

export const roomRoutes = Router();

// Public Routes
roomRoutes.get('/', roomController.getPublicRooms);
roomRoutes.get('/locations/counts', roomController.getLocationCounts);

// Protected Routes (Owner Only)
// IMPORTANT: static paths must come BEFORE /:id to avoid being parsed as a dynamic segment
roomRoutes.get(
  '/dashboard/summary',
  requireAuth,
  requireRole('owner'),
  roomController.getDashboardSummary
);

roomRoutes.get(
  '/my',
  requireAuth,
  requireRole('owner'),
  roomController.getOwnerRooms
);

roomRoutes.post(
  '/',
  requireAuth,
  requireRole('owner'),
  roomController.createRoom
);

// Public Routes (Dynamic ID)
roomRoutes.get('/:id', roomController.getRoomById);

// Protected Routes (Dynamic ID, Owner Only)
roomRoutes.patch(
  '/:id',
  requireAuth,
  requireRole('owner'),
  roomController.updateRoom
);

roomRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('owner'),
  roomController.softDeleteRoom
);

roomRoutes.patch(
  '/:id/availability',
  requireAuth,
  requireRole('owner'),
  roomController.updateAvailability
);
