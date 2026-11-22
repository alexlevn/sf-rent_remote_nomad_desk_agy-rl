import './load-env';
import * as path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

async function runMigrate() {
  console.log('Running migrations...');
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');
  await migrate(db, { migrationsFolder });
  console.log('Migrations finished successfully.');
}

async function main() {
  try {
    await runMigrate();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
