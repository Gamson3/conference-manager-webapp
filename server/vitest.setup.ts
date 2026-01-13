import dotenv from 'dotenv';
import path from 'path';

// Load test env FIRST, before app/prisma modules are imported by tests.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// Ensure test-mode behavior (header-based auth injection, etc.)
process.env.NODE_ENV = 'test';

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl || testUrl.trim().length === 0) {
  throw new Error(
    'Missing DATABASE_URL_TEST for vitest. Create server/.env.test with DATABASE_URL_TEST=... (pointing to a test database).'
  );
}

// Fail fast if someone accidentally points tests at a non-test DB.
// You can override this guard by setting ALLOW_NON_TEST_DB=true.
const allowNonTestDb = (process.env.ALLOW_NON_TEST_DB ?? '').toLowerCase() === 'true';
if (!allowNonTestDb && !/(\btest\b|_test\b)/i.test(testUrl)) {
  throw new Error(
    `Refusing to run tests against a database that doesn't look like a test DB: ${testUrl}. ` +
      'Use a *_test database name or set ALLOW_NON_TEST_DB=true if you know what you are doing.'
  );
}

// Prisma schema uses DATABASE_URL; force it to the test database.
process.env.DATABASE_URL = testUrl;
