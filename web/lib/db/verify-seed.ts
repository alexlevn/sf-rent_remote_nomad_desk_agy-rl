import './load-env';
import { sql } from 'drizzle-orm';
import { db, pool } from './client';
import * as schema from './schema';

interface ExpectedCounts {
  name: string;
  expected: number;
  actual: number;
}

export async function verifySeed(): Promise<boolean> {
  console.log('--- Verifying DB Seed Record Counts ---');

  const [
    [{ count: locationsCount }],
    [{ count: categoriesCount }],
    [{ count: propertiesCount }],
    [{ count: hostsCount }],
    [{ count: usersCount }],
    [{ count: travelGuidesCount }],
    [{ count: blogPostsCount }],
    [{ count: communityVideosCount }],
    [{ count: reservationsCount }],
    [{ count: blockedDatesCount }],
    [{ count: workstationPackagesCount }],
    [{ count: workstationComponentsCount }],
    [{ count: workstationAddonsCount }],
    [{ count: settingsCount }],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(schema.locations),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.categories),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.properties),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.hostProfiles),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.users),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.travelGuides),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.blogPosts),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.communityVideos),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.reservations),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.blockedDates),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.workstationPackages),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.workstationComponents),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.workstationAddons),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.settings),
  ]);

  const checks: ExpectedCounts[] = [
    { name: 'locations', expected: 34, actual: locationsCount },
    { name: 'categories', expected: 6, actual: categoriesCount },
    { name: 'properties', expected: 8, actual: propertiesCount },
    { name: 'hostProfiles (hosts)', expected: 3, actual: hostsCount },
    { name: 'users', expected: 5, actual: usersCount },
    { name: 'travelGuides', expected: 8, actual: travelGuidesCount },
    { name: 'blogPosts', expected: 2, actual: blogPostsCount },
    { name: 'communityVideos (videos)', expected: 7, actual: communityVideosCount },
    { name: 'reservations', expected: 6, actual: reservationsCount },
    { name: 'blockedDates', expected: 2, actual: blockedDatesCount },
    { name: 'workstationPackages', expected: 2, actual: workstationPackagesCount },
    { name: 'workstationComponents', expected: 8, actual: workstationComponentsCount },
    { name: 'workstationAddons', expected: 5, actual: workstationAddonsCount },
    { name: 'settings', expected: 1, actual: settingsCount },
  ];

  let hasMismatch = false;
  console.table(
    checks.map((c) => ({
      Entity: c.name,
      Expected: c.expected,
      Actual: c.actual,
      Status: c.expected === c.actual ? 'MATCH' : 'MISMATCH',
    }))
  );

  for (const c of checks) {
    if (c.expected !== c.actual) {
      console.error(
        `[MISMATCH] ${c.name}: expected ${c.expected}, but got ${c.actual}`
      );
      hasMismatch = true;
    }
  }

  if (hasMismatch) {
    console.error('Seed verification FAILED with record count mismatches.');
    return false;
  }

  console.log('Seed verification PASSED: 100% record counts match spec.');
  return true;
}

async function main() {
  try {
    const passed = await verifySeed();
    if (!passed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Verification script failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module || process.argv[1]?.endsWith('verify-seed.ts')) {
  void main();
}
