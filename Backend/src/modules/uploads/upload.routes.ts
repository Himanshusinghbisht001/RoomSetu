/**
 * Upload Routes
 *
 * POST /api/v1/uploads/images
 *  — Authenticated (any role: owner uploading room images)
 *  — Accepts multipart/form-data with field "images" (1–4 files)
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { uploadImages } from './upload.controller.js';

export const uploadRoutes = Router();

uploadRoutes.post(
  '/images',
  requireAuth,
  uploadImages,
);
