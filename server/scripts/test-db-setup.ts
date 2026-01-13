import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists(testUrl: string): Promise<void> {
  const parsed = new URL(testUrl);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!dbName) {
    throw new Error(`DATABASE_URL_TEST does not include a database name: ${testUrl}`);
  }

  const adminDb = process.env.TEST_DB_ADMIN_DATABASE ?? 'postgres';
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = `/${encodeURIComponent(adminDb)}`;

  const client = new Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();
    const existsResult = await client.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
      [dbName]
    );

    const exists = existsResult.rows[0]?.exists ?? false;
    if (exists) return;

    await client.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
  } finally {
    await client.end();
  }
}

async function runMigrations(testUrl: string): Promise<void> {
  const repoRoot = path.resolve(__dirname, '..');

  await execFileAsync(
    'npx',
    ['prisma', 'migrate', 'deploy'],
    {
      cwd: repoRoot,
      shell: true,
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
      },
    }
  );
}

async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

  process.env.NODE_ENV = 'test';

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl || testUrl.trim().length === 0) {
    throw new Error(
      'Missing DATABASE_URL_TEST. Create server/.env.test with DATABASE_URL_TEST=... (pointing to a test database).'
    );
  }

  const allowNonTestDb = (process.env.ALLOW_NON_TEST_DB ?? '').toLowerCase() === 'true';
  if (!allowNonTestDb && !/(\btest\b|_test\b)/i.test(testUrl)) {
    throw new Error(
      `Refusing to set up a database that doesn't look like a test DB: ${testUrl}. ` +
        'Use a *_test database name or set ALLOW_NON_TEST_DB=true if you know what you are doing.'
    );
  }

  await ensureDatabaseExists(testUrl);
  await runMigrations(testUrl);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`test-db-setup failed: ${message}`);
  process.exitCode = 1;
});
