import { NextResponse } from 'next/server';
import { eq, gt, inArray, notInArray } from 'drizzle-orm';
import { resetMockData } from '@/lib/api/mock/seed-data';
import { resetSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import {
  blockedDates,
  hostProfiles,
  locations,
  properties,
  reservations,
  settings,
  travelGuides,
  users,
  workstationPackages,
} from '@/lib/db/schema';
import { DEFAULT_EXCHANGE_RATES } from '@/lib/pricing';

const SEED_PROPERTY_IDS = [16060, 16061, 17001, 17002, 18001, 18002, 19001, 19002];
const SEED_TRAVEL_GUIDE_IDS = [361, 362, 363, 364, 365, 366, 367, 368];
const SEED_LOCATION_MAX_ID = 4360;
const SEED_FEATURED_POSITIONS: Record<number, number | null> = {
  16060: 1,
  16061: 2,
  17001: 3,
  17002: null,
  18001: 5,
  18002: null,
  19001: 7,
  19002: null,
};

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
    await db.delete(travelGuides).where(notInArray(travelGuides.id, SEED_TRAVEL_GUIDE_IDS));
    await db.delete(locations).where(gt(locations.id, SEED_LOCATION_MAX_ID));
    await db.update(locations).set({ isActive: true });

    for (const propId of SEED_PROPERTY_IDS) {
      await db
        .update(properties)
        .set({
          status: 'published',
          rejectionReason: null,
          featuredPosition: SEED_FEATURED_POSITIONS[propId] ?? null,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, propId));
    }

    await db
      .update(workstationPackages)
      .set({ monthlyPriceEUR: 15000 })
      .where(eq(workstationPackages.slug, 'pro-upgrade'));

    await db
      .insert(settings)
      .values({
        key: 'currency_rates',
        value: { ...DEFAULT_EXCHANGE_RATES },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: { ...DEFAULT_EXCHANGE_RATES },
          updatedAt: new Date(),
        },
      });

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
