import { z } from 'zod';

/**
 * Environment variable schema — validated at startup using Zod.
 * If any required variable is missing or invalid, the process exits immediately.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a number')
    .default('5000')
    .transform(Number),

  MONGODB_URI: z
    .string({ message: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI cannot be empty'),

  JWT_ACCESS_SECRET: z
    .string({ message: 'JWT_ACCESS_SECRET is required' })
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),

  JWT_REFRESH_SECRET: z
    .string({ message: 'JWT_REFRESH_SECRET is required' })
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  JWT_ACCESS_EXPIRES_IN: z
    .string({ message: 'JWT_ACCESS_EXPIRES_IN is required' })
    .default('15m'),

  JWT_REFRESH_EXPIRES_IN: z
    .string({ message: 'JWT_REFRESH_EXPIRES_IN is required' })
    .default('7d'),

  CLIENT_URL: z
    .string({ message: 'CLIENT_URL is required' })
    .url('CLIENT_URL must be a valid URL'),

  CORS_ORIGINS: z
    .string({ message: 'CORS_ORIGINS is required' })
    .min(1, 'CORS_ORIGINS cannot be empty'),

  AUTH_MAX_FAILED_ATTEMPTS: z
    .string()
    .regex(/^\d+$/, 'AUTH_MAX_FAILED_ATTEMPTS must be a number')
    .default('5')
    .transform(Number),

  AUTH_LOCKOUT_MINUTES: z
    .string()
    .regex(/^\d+$/, 'AUTH_LOCKOUT_MINUTES must be a number')
    .default('15')
    .transform(Number),

  SENTRY_DSN: z.string().optional(),

  // ── Cloudinary (optional — validated lazily in the upload service) ──────
  // If absent, the upload endpoint returns a clean 503; the server still starts.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ── SMTP / Email Notifications (optional — validated lazily in email.service) ──
  // All optional: if absent the server starts normally and email is skipped.
  // SMTP_PASS is intentionally NOT logged anywhere in this codebase.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .regex(/^\d+$/, 'SMTP_PORT must be a number')
    .transform(Number)
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FEEDBACK_RECEIVER_EMAIL: z.string().email('FEEDBACK_RECEIVER_EMAIL must be a valid email').optional(),
});

// Parse and validate — fail fast on missing/invalid config
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('');
  console.error('[RoomSetu] ❌  Invalid environment configuration:');
  _parsed.error.issues.forEach((issue: z.ZodIssue) => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('');
  console.error('[RoomSetu] Ensure all required variables are set in .env');
  console.error('           See .env.example for reference.');
  console.error('');
  process.exit(1);
}

export const env = _parsed.data;

/**
 * Derived helpers
 */
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/**
 * Parse CORS_ORIGINS into an array of allowed origin strings.
 * e.g. "http://localhost:5173,https://roomsetu.in"
 */
export const allowedOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((o: string) => o.trim())
  .filter(Boolean);
