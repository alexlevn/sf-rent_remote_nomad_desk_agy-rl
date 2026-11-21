import { NextResponse } from 'next/server';
import { eq, gt, inArray, notInArray } from 'drizzle-orm';
import { resetMockData } from '@/lib/api/mock/seed-data';
import { resetSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import {
  blockedDates,
  hostProfiles,
  properties,
  reservations,
  users,
} from '@/lib/db/schema';

const SEED_PROPERTY_IDS = [16060, 16061, 17001, 17002, 18001, 18002, 19001, 19002];

function getRelativeDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  resetMockData();
  resetSession();

  try {
    // Clean non-seed records and restore seed states for deterministic E2E isolation
    await db.delete(blockedDates).where(gt(blockedDates.id, 2));
    await db.delete(reservations).where(gt(reservations.id, 6));
    await db.delete(properties).where(notInArray(properties.id, SEED_PROPERTY_IDS));
    await db.delete(hostProfiles).where(gt(hostProfiles.id, 3));

    await db
      .update(properties)
      .set({ status: 'published', rejectionReason: null, updatedAt: new Date() })
      .where(inArray(properties.id, SEED_PROPERTY_IDS));

    await db
      .update(hostProfiles)
      .set({ status: 'approved', rejectionReason: null })
      .where(inArray(hostProfiles.id, [1, 2]));

    await db
      .update(hostProfiles)
      .set({ status: 'pending', rejectionReason: null, approvedAt: null })
      .where(eq(hostProfiles.id, 3));

    await db
      .update(users)
      .set({ role: 'guest', isActive: true })
      .where(inArray(users.id, [1, 5]));
    await db
      .update(users)
      .set({ role: 'host', isActive: true })
      .where(inArray(users.id, [3, 4]));
    await db
      .update(users)
      .set({ role: 'admin', isActive: true })
      .where(eq(users.id, 2));

    const now = new Date();
    await db
      .update(reservations)
      .set({
        status: 'pending',
        paymentStatus: 'authorized',
        rejectionReason: null,
        cancelledBy: null,
        moveInDate: getRelativeDateStr(40),
        moveOutDate: getRelativeDateStr(70),
        respondBy: new Date(now.getTime() + 48 * 3600 * 1000),
        updatedAt: now,
      })
      .where(eq(reservations.code, 'ND-SEED1'));

    await db
      .update(reservations)
      .set({
        status: 'confirmed',
        paymentStatus: 'captured',
        rejectionReason: null,
        cancelledBy: null,
        moveInDate: getRelativeDateStr(20),
        moveOutDate: getRelativeDateStr(50),
        updatedAt: now,
      })
      .where(eq(reservations.code, 'ND-SEED2'));
  } catch (err) {
    console.error('[mock/reset] DB seed reset skipped:', err);
  }

  return NextResponse.json({
    ok: true,
    message: 'Mock data store reset successfully to initial snapshot',
  });
}
