import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from './utils/response.js';

const router = Router();

/**
 * GET /api/v1/health
 *
 * Liveness check — confirms the API process is alive and accepting requests.
 * Does NOT check database readiness (keep liveness and readiness concerns separate).
 */
router.get('/health', (_req: Request, res: Response): void => {
  sendSuccess(res, { status: 'ok' });
});

/**
 * GET /api/v1/ready
 *
 * Readiness check — verifies that the application is fully ready to handle traffic,
 * including having an active database connection.
 */
router.get('/ready', (_req: Request, res: Response): void => {
  // mongoose.connection.readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting, 99=uninitialized
  if (mongoose.connection.readyState === 1) {
    sendSuccess(res, { status: 'ready' });
  } else {
    // Return 503 Service Unavailable if DB is not ready
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection is not ready',
      },
    });
  }
});

export { router as healthRouter };
