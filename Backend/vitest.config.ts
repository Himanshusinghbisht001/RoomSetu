import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // setupFiles run in the worker process BEFORE any test module is imported.
    // This is the correct place to set process.env so that env.ts passes validation.
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.ts'],
    // Allow 60 s for beforeAll hooks — needed for Atlas cold-start connection latency.
    hookTimeout: 60_000,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
