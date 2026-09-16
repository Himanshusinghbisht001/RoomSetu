import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';
import { isDev } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Central Express error-handling middleware.
 * Must be registered LAST, after all routes and middleware.
 *
 * Handles:
 *  - AppError (operational errors thrown by our code)
 *  - ZodError  (validation errors that escape the validate() middleware)
 *  - Mongoose errors
 *  - Unknown / programming errors
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // ── 1. Operational AppError ───────────────────────────────────────────────
  if (err instanceof AppError) {
    if (isDev) {
      logger.warn(`AppError ${err.code} (${err.statusCode}): ${err.message}`);
    }

    sendError(res, err.statusCode, err.code, err.message, err.fields);
    return;
  }

  // ── 2. Zod validation error ───────────────────────────────────────────────
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    err.issues.forEach((issue) => {
      const field = issue.path.join('.');
      if (!fields[field]) fields[field] = [];
      (fields[field] as string[]).push(issue.message);
    });

    sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', fields);
    return;
  }

  // ── 3. Mongoose duplicate key error (code 11000) ──────────────────────────
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  ) {
    sendError(res, 409, 'CONFLICT', 'A resource with that value already exists');
    return;
  }

  // ── 4. Mongoose CastError (invalid ObjectId, etc.) ────────────────────────
  if (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: unknown }).name === 'CastError'
  ) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid ID format');
    return;
  }

  // ── 5. Unknown / programming errors ──────────────────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';

  // Always log unknown errors server-side — but only the message, never the full object
  // which could contain sensitive data in its stack or context
  logger.error('Unhandled error', {
    message,
    name: err instanceof Error ? err.name : 'UnknownError',
    stack: isDev && err instanceof Error ? err.stack : undefined,
  });

  // Never expose internal error details in production
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isDev ? message : 'An internal server error occurred',
  );
};

/**
 * 404 handler — catches requests that do not match any route.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(
    res,
    404,
    'NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found`,
  );
};
