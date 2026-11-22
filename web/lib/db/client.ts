import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from '@/lib/env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Always cache pool on globalThis so Next.js route/page chunks share a single connection pool
export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type DbClient = typeof db;
