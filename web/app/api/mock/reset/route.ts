import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { resetMockData } from '@/lib/api/mock/seed-data';
import { resetSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { properties } from '@/lib/db/schema';

const SEED_PROPERTY_IDS = [16060, 16061, 17001, 17002, 18001, 18002, 19001, 19002];

export async function POST() {
  resetMockData();
  resetSession();

  try {
    // Restore seed properties to published status for clean E2E test isolation
    await db
      .update(properties)
      .set({ status: 'published', rejectionReason: null, updatedAt: new Date() })
      .where(inArray(properties.id, SEED_PROPERTY_IDS));
  } catch (err) {
    console.error('[mock/reset] DB seed property reset skipped:', err);
  }

  return NextResponse.json({
    ok: true,
    message: 'Mock data store reset successfully to initial snapshot',
  });
}
