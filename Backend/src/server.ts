import http from 'http';
import 'dotenv/config';

// env.ts validates all variables and exits the process if any are missing
import { env } from './config/env.js';
import * as Sentry from '@sentry/node';

if (env.SENTRY_DSN) {
  /**
   * Sensitive keys that must never be forwarded to Sentry, regardless of
   * where they appear (headers, cookies, or request body).
   */
  const SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'refreshtoken',
    'refreshtokenhash',
    'token',
    'accesstoken',
    'authorization',
    'cookie',
  ]);

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 1.0,
    beforeSend(event) {
      if (event.request) {
        // Scrub cookies and sensitive headers
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        // Scrub request body (event.request.data) — covers login/register
        // payloads that may contain password, tokens, or other secrets.
        if (event.request.data && typeof event.request.data === 'object') {
          const data = event.request.data as Record<string, unknown>;
          for (const key of Object.keys(data)) {
            if (SENSITIVE_KEYS.has(key.toLowerCase())) {
              data[key] = '[Filtered]';
            }
          }
        } else if (typeof event.request.data === 'string') {
          // If data is a raw string (e.g. form-encoded), replace entirely
          // rather than risking partial exposure of sensitive values.
          event.request.data = '[Filtered]';
        }
      }
      return event;
    },
  });
}

import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { initSocketServer } from './sockets/socket.js';

const app = createApp();
const httpServer = http.createServer(app);

// Initialize Socket.io
initSocketServer(httpServer);

async function start(): Promise<void> {
  // Connect to MongoDB before accepting traffic
  await connectDB();

  const server = httpServer.listen(env.PORT, () => {
    logger.info('RoomSetu Backend started', {
      environment: env.NODE_ENV,
      port: env.PORT,
      health: `http://localhost:${env.PORT}/api/v1/health`,
    });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDB();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    // Let the process crash so the process manager (PM2, Docker) can restart it
    process.exit(1);
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { message: error.message });
    process.exit(1);
  });
}

start().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Failed to start: ${message}`);
  process.exit(1);
});
