import { NextResponse } from 'next/server';
import { eq, gt, inArray, notInArray, sql } from 'drizzle-orm';
import { resetMockData } from '@/lib/api/mock/seed-data';
import { resetSession } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import {
  blockedDates,
  blogPosts,
  communityVideos,
  hostProfiles,
  locations,
  media,
  properties,
  reservations,
  settings,
  travelGuides,
  users,
  workstationAddons,
  workstationComponents,
  workstationPackages,
} from '@/lib/db/schema';
import { isMockResetAllowed } from '@/lib/env';
import { getUtcOffsetDateString } from '@/lib/format';
import { DEFAULT_EXCHANGE_RATES } from '@/lib/pricing';
import { deleteUploadFile } from '@/lib/storage/upload';

const SEED_PROPERTY_IDS = [16060, 16061, 17001, 17002, 18001, 18002, 19001, 19002];
const SEED_TRAVEL_GUIDE_IDS = [361, 362, 363, 364, 365, 366, 367, 368];
const SEED_LOCATION_MAX_ID = 4360;
const SEED_FEATURED_POSITIONS: ReadonlyArray<[number, number | null]> = [
  [16060, 1],
  [16061, 2],
  [17001, 3],
  [17002, null],
  [18001, 5],
  [18002, null],
  [19001, 7],
  [19002, null],
];

export async function POST(request?: Request) {
  if (!isMockResetAllowed()) {
    return NextResponse.json(
      { error: 'Forbidden: Reset endpoint is disabled in this environment.' },
      { status: 403 }
    );
  }

  resetMockData();
  resetSession();

  let keepMedia = false;
  if (request?.url) {
    try {
      keepMedia = new URL(request.url).searchParams.get('keepMedia') === '1';
    } catch {
      keepMedia = false;
    }
  }

  try {
    // Clean uploaded media unless keepMedia=1 is explicitly requested
    if (!keepMedia) {
      const existingMedia = await db
        .select({ id: media.id, storageKey: media.storageKey })
        .from(media);
      if (existingMedia.length > 0) {
        await db.delete(media);
        await Promise.allSettled(
          existingMedia.map((row) => deleteUploadFile(row.storageKey)),
        );
      }
    }

    // Clean non-seed records and restore seed states for deterministic E2E isolation
    await db.delete(blockedDates).where(gt(blockedDates.id, 2));
    await db.delete(reservations).where(gt(reservations.id, 6));
    await db.delete(properties).where(notInArray(properties.id, SEED_PROPERTY_IDS));
    await db.delete(hostProfiles).where(gt(hostProfiles.id, 3));
    await db.delete(travelGuides).where(notInArray(travelGuides.id, SEED_TRAVEL_GUIDE_IDS));
    await db.delete(blogPosts).where(gt(blogPosts.id, 2));
    await db.delete(communityVideos).where(gt(communityVideos.id, 7));
    await db.update(communityVideos).set({ isActive: true });
    await db.delete(locations).where(gt(locations.id, SEED_LOCATION_MAX_ID));
    await db.update(locations).set({ isActive: true });

    // Restore all 8 seeded properties in a single batched SQL UPDATE instead of a loop
    const now = new Date();
    const featuredValues = sql.join(
      SEED_FEATURED_POSITIONS.map(
        ([propId, pos]) =>
          pos === null
            ? sql`(${propId}::int, NULL::int)`
            : sql`(${propId}::int, ${pos}::int)`
      ),
      sql`, `
    );
    await db.execute(sql`
      UPDATE ${properties} AS p
      SET status = 'published',
          rejection_reason = NULL,
          featured_position = v.pos,
          updated_at = ${now}
      FROM (VALUES ${featuredValues}) AS v(id, pos)
      WHERE p.id = v.id
    `);

    await db.update(workstationPackages).set({ isActive: true });
    await db.update(workstationComponents).set({ isActive: true });
    await db.update(workstationAddons).set({ isActive: true });

    await db
      .update(workstationPackages)
      .set({ monthlyPriceEUR: 15000 })
      .where(eq(workstationPackages.slug, 'pro-upgrade'));

    await db
      .insert(settings)
      .values({
        key: 'currency_rates',
        value: { ...DEFAULT_EXCHANGE_RATES },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: { ...DEFAULT_EXCHANGE_RATES },
          updatedAt: now,
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

    await db
      .update(reservations)
      .set({
        status: 'pending',
        paymentStatus: 'authorized',
        rejectionReason: null,
        cancelledBy: null,
        moveInDate: getUtcOffsetDateString(40, now),
        moveOutDate: getUtcOffsetDateString(70, now),
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
        moveInDate: getUtcOffsetDateString(20, now),
        moveOutDate: getUtcOffsetDateString(50, now),
        updatedAt: now,
      })
      .where(eq(reservations.code, 'ND-SEED2'));
  } catch (err) {
    console.error('[mock/reset] DB seed reset failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Database reset failed.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Mock data store reset successfully to initial snapshot',
  });
}
