import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function runMigrate() {
  console.log('Running migrations...');
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');
  await migrate(db, { migrationsFolder });
  console.log('Migrations finished successfully.');
  await pool.end();
}

runMigrate().catch((err) => {
  console.error('Migration failed:', err);
  pool.end();
  process.exit(1);
});
