import { createLogger, format, transports } from 'winston';
import { isDev } from '../config/env.js';

// ── Sensitive field names to redact ──────────────────────────────────────────
// Any key matching these (case-insensitive) will be replaced with '[REDACTED]'
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'jwt_access_secret',
  'jwt_refresh_secret',
  'authorization',
  'cookie',
  'set-cookie',
  'mongodb_uri',
  'mongo_uri',
  'database_url',
  'db_url',
  'secret',
  'token',
  'apikey',
  'api_key',
]);

/**
 * Recursively redact sensitive fields from an object.
 * Returns a new object — never mutates the original.
 */
function redact(value: unknown, depth = 0): unknown {
  // Guard against deeply nested or circular structures
  if (depth > 8) return '[DEPTH_LIMIT]';

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Redact anything that looks like a JWT (three base64url segments)
    if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) {
      return '[JWT_REDACTED]';
    }
    // Redact MongoDB URIs
    if (/mongodb(?:\+srv)?:\/\//i.test(value)) {
      return '[MONGODB_URI_REDACTED]';
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redact(val, depth + 1);
      }
    }
    return result;
  }

  return value;
}

// ── Custom format: redact sensitive data from log metadata ────────────────────
const redactFormat = format((info) => {
  // Redact the entire info object's extra metadata
  const { level, message, timestamp, stack, ...rest } = info as {
    level: string;
    message: string;
    timestamp?: string;
    stack?: string;
    [key: string]: unknown;
  };

  const redacted = redact(rest) as Record<string, unknown>;

  return Object.assign(info, redacted, { level, message, timestamp, stack });
})();

// ── Development format: colorized, human-readable ─────────────────────────────
const devFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.colorize(),
  redactFormat,
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? ' ' + JSON.stringify(redact(meta))
      : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
  }),
);

// ── Production format: structured JSON ────────────────────────────────────────
const prodFormat = format.combine(
  format.timestamp(),
  redactFormat,
  format.errors({ stack: true }),
  format.json(),
);

// ── Logger instance ───────────────────────────────────────────────────────────
export const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
  ],
  // Never exit on uncaught errors inside the logger itself
  exitOnError: false,
});
