import { Router } from 'express';
import * as inquiryController from './inquiry.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/roleGuard.js';

// ── Room-scoped routes: /api/v1/rooms/:roomId/inquiries ─────────────────────
export const inquiryRoomRoutes = Router({ mergeParams: true });

// Seeker creates an inquiry for a room
inquiryRoomRoutes.post(
  '/',
  requireAuth,
  requireRole('seeker'),
  inquiryController.createInquiry,
);

// ── Standalone inquiry routes: /api/v1/inquiries ────────────────────────────
export const inquiryRoutes = Router();

// Owner: view received inquiries
inquiryRoutes.get(
  '/received',
  requireAuth,
  requireRole('owner'),
  inquiryController.getReceivedInquiries,
);

// Seeker: view own inquiries
inquiryRoutes.get(
  '/my',
  requireAuth,
  requireRole('seeker'),
  inquiryController.getMyInquiries,
);

// Owner: accept a pending inquiry
inquiryRoutes.patch(
  '/:inquiryId/accept',
  requireAuth,
  requireRole('owner'),
  inquiryController.acceptInquiry,
);

// Owner: reject a pending inquiry
inquiryRoutes.patch(
  '/:inquiryId/reject',
  requireAuth,
  requireRole('owner'),
  inquiryController.rejectInquiry,
);

// Seeker: cancel a pending inquiry
inquiryRoutes.patch(
  '/:inquiryId/cancel',
  requireAuth,
  requireRole('seeker'),
  inquiryController.cancelInquiry,
);
