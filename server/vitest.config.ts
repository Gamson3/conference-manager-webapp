import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // These integration tests share a real Postgres DB and perform destructive cleanup.
    // Running files concurrently causes cross-test interference and FK-related flakiness.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    // Increased timeout for hooks (beforeAll/afterAll) to handle slow database resets
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
