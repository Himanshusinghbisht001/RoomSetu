/**
 * Vitest global setup — runs before any test module is imported.
 * Sets environment variables so env.ts validation passes without a real .env file.
 * Values here are safe test-only values; no real secrets are committed.
 */

// ── Safe test-only environment values ────────────────────────────────────────
// These satisfy Zod's min-length checks and JWT signing requirements.
// They are NOT real credentials — they exist only so tests run in isolation.
process.env['NODE_ENV'] = 'test';
process.env['MONGODB_URI'] = 'mongodb://127.0.0.1/roomsetu_test_placeholder';
process.env['JWT_ACCESS_SECRET'] = 'test_access_secret_placeholder_32chars!!';
process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_placeholder_32chars!';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['CLIENT_URL'] = 'http://localhost:5173';
process.env['CORS_ORIGINS'] = 'http://localhost:5173';
process.env['PORT'] = '5001';
