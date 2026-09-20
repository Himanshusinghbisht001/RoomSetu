import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';

import { allowedOrigins, isDev, isProd, env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes.js';
import cookieParser from 'cookie-parser';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { roomRoutes } from './modules/rooms/room.routes.js';
import { sessionRoutes } from './modules/auth/session.routes.js';
import { uploadRoutes } from './modules/uploads/upload.routes.js';
import { feedbackRoutes } from './modules/feedback/feedback.routes.js';
import { reviewRoomRoutes, reviewRoutes } from './modules/reviews/review.routes.js';
import * as Sentry from '@sentry/node';

/**
 * Creates and configures the Express application.
 * Separated from server.ts so the app can be imported in tests
 * without starting the HTTP server.
 */
export function createApp(): Application {
  const app = express();

  // ── Trust proxy — MUST be set before HTTPS enforcement ───────────────────
  // Without this, req.secure is always false behind a reverse proxy and
  // x-forwarded-proto values are not trusted by Express.
  if (!isDev) {
    app.set('trust proxy', 1);
  }

  // ── Production HTTPS Enforcement ──────────────────────────────────────────
  if (isProd) {
    app.use((req, res, next) => {
      // x-forwarded-proto may be a comma-separated list when passing through
      // multiple proxies (e.g. "https, http" from ELB → Nginx → Express).
      // Only the first (outermost / client-side) value is authoritative.
      const proto = req.headers['x-forwarded-proto'];
      const firstProto =
        typeof proto === 'string' ? proto.split(',')[0].trim() : '';
      const isHttps = req.secure || firstProto === 'https';

      if (!isHttps) {
        // Reject insecure API requests in production.
        // Redirecting is intentionally avoided — it risks infinite loops behind
        // proxies and is inappropriate for API traffic.
        res.status(403).json({
          success: false,
          error: {
            code: 'INSECURE_REQUEST',
            message: 'HTTPS is required in production',
          },
        });
        return;
      }
      next();
    });
  }

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS — explicit allowed origins only ──────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, Postman, mobile apps)
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: Origin '${origin}' is not allowed`));
        }
      },
      credentials: true,          // Required for HttpOnly cookie refresh tokens
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Request logging ───────────────────────────────────────────────────────
  // Use 'dev' format in development (coloured, concise)
  // Use 'combined' format in production (structured, suitable for log aggregation)
  app.use(morgan(isDev ? 'dev' : 'combined'));

  // ── Body & Cookie parsing ────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  // ── NoSQL injection protection ──────────────────────────────────────────
  // express-mongo-sanitize middleware assigns req.query = target, which fails in Express 5
  // We use the underlying sanitize function which modifies objects in place.
  app.use((req, _res, next) => {
    // Cast req to a plain record so we can index into body/params/query/headers
    // without hitting TypeScript's strict Express 5 property type constraints.
    const r = req as unknown as Record<string, unknown>;
    for (const key of ['body', 'params', 'query', 'headers']) {
      if (r[key] && typeof r[key] === 'object') {
        mongoSanitize.sanitize(r[key] as Record<string, unknown>);
      }
    }
    next();
  });

  // trust proxy is set earlier, before HTTPS enforcement — see above

  // ── Global Rate Limiting ──────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.'
      }
    }
  });
  app.use('/api', globalLimiter);

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api/v1', healthRouter);

  // Mount Auth, User and Room routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/users', userRoutes);
  
  // Specific room review routes must be mounted before the general roomRoutes, 
  // so /:roomId/reviews isn't swallowed by /:id in roomRoutes.
  app.use('/api/v1/rooms/:roomId/reviews', reviewRoomRoutes);
  app.use('/api/v1/rooms', roomRoutes);
  
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/uploads', uploadRoutes);
  app.use('/api/v1/feedback', feedbackRoutes);

  // Future module routes will be mounted here in later phases:
  // app.use('/api/v1/locations', locationRouter);

  // ── 404 for unmatched routes ──────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Sentry Error Handler ──────────────────────────────────────────────────
  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // ── Central error handler — must be last ──────────────────────────────────
  app.use(errorHandler);

  return app;
}
