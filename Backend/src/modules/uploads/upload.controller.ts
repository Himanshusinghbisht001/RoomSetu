/**
 * Upload Controller
 *
 * POST /api/v1/uploads/images
 *
 * Accepts multipart/form-data with up to 4 image files (field name: "images").
 * Validates MIME type, file count, and file size server-side (never trusts the client).
 * Uploads to Cloudinary via the upload service and returns permanent HTTPS URLs.
 *
 * SECURITY:
 *  - Requires authentication (requireAuth middleware on the route).
 *  - Cloudinary API secret is never included in responses or error messages.
 *  - Files are processed in memory only — no disk writes.
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  uploadImageBuffers,
  UploadServiceUnavailableError,
  UploadFailedError,
} from '../../services/upload.service.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILES = 4;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

// ── Multer — memory storage, no disk writes ───────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files:    MAX_FILES,
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      // Pass an error; multer will call next(error) automatically
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WebP.`));
    }
  },
}).array('images', MAX_FILES);

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/uploads/images
 *
 * Request: multipart/form-data, field "images" (1–4 files)
 * Response: { success: true, data: { urls: string[] } }
 */
export const uploadImages = (req: Request, res: Response, next: NextFunction): void => {
  // Run multer inline so we can intercept its errors cleanly
  upload(req, res, async (err) => {
    if (err) {
      // multer errors (file count / size / MIME)
      const multerErr = err as Error & { code?: string };

      if (multerErr.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: `Maximum ${MAX_FILES} images allowed per upload.`,
          },
        });
        return;
      }

      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: `Each image must not exceed ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
          },
        });
        return;
      }

      // MIME type rejection or unexpected multer error — message is safe to forward
      res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: err.message || 'Invalid file.',
        },
      });
      return;
    }

    try {
      const files = req.files as Express.Multer.File[] | undefined;

      // Re-validate after multer (belt-and-suspenders — never trust the client)
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: 'At least one image file is required.',
          },
        });
        return;
      }

      if (files.length > MAX_FILES) {
        res.status(400).json({
          success: false,
          error: {
            code:    'VALIDATION_ERROR',
            message: `Maximum ${MAX_FILES} images allowed per upload.`,
          },
        });
        return;
      }

      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          res.status(400).json({
            success: false,
            error: {
              code:    'VALIDATION_ERROR',
              message: `File "${file.originalname}" has unsupported type ${file.mimetype}. Allowed: JPG, PNG, WebP.`,
            },
          });
          return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          res.status(400).json({
            success: false,
            error: {
              code:    'VALIDATION_ERROR',
              message: `File "${file.originalname}" exceeds the 5 MB limit.`,
            },
          });
          return;
        }
      }

      // Upload all files to Cloudinary concurrently
      const urls = await uploadImageBuffers(
        files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype })),
      );

      res.status(200).json({
        success: true,
        data: { urls },
      });
    } catch (error) {
      if (error instanceof UploadServiceUnavailableError) {
        // Credentials missing — safe to surface the message (no secret in it)
        res.status(503).json({
          success: false,
          error: {
            code:    'SERVICE_UNAVAILABLE',
            message: error.message, // "Image upload service is not configured."
          },
        });
        return;
      }

      if (error instanceof UploadFailedError) {
        res.status(502).json({
          success: false,
          error: {
            code:    'UPLOAD_FAILED',
            message: error.message, // "Failed to upload image. Please try again."
          },
        });
        return;
      }

      // Unknown error — delegate to global error handler
      next(error);
    }
  });
};
