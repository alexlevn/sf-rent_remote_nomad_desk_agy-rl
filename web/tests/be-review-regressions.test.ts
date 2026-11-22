import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { POST as postMockReset } from '@/app/api/mock/reset/route';
import { HEAD as headUploadRoute } from '@/app/uploads/[...path]/route';
import { addFavorite } from '@/lib/api/favorites';
import { listLocations, saveLocation } from '@/lib/api/locations';
import { listProperties } from '@/lib/api/properties';
import {
  createReservation,
  getReservationByCode,
  updateReservationStatus,
} from '@/lib/api/reservations';
import { getUserById, updateUser } from '@/lib/api/users';
import { db } from '@/lib/db/client';
import { reservations } from '@/lib/db/schema';
import { isMockResetAllowed } from '@/lib/env';
import { getUtcOffsetDateString } from '@/lib/format';
import { saveUploadedBuffer } from '@/lib/storage/upload';
import { sanitizeHtml } from '@/lib/validations/content';
import { locationInputSchema } from '@/lib/validations/location';

describe('S9 BE Review Regression Suite', () => {
  const createdReservationIds: number[] = [];
  let tempRoot = '';
  let originalUploadDir: string | undefined;

  beforeAll(async () => {
    originalUploadDir = process.env.UPLOAD_DIR;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nomaddesk-s9-reg-'));
    process.env.UPLOAD_DIR = path.join(tempRoot, 'uploads');
  });

  afterEach(async () => {
    if (createdReservationIds.length > 0) {
      const ids = createdReservationIds.splice(0);
      await db.delete(reservations).where(inArray(reservations.id, ids));
    }
  });

  afterAll(async () => {
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = originalUploadDir;
    }
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('fails closed on /api/mock/reset in production when ALLOW_MOCK_RESET is not true', async () => {
    const env = process.env as Record<string, string | undefined>;
    const prevNodeEnv = env.NODE_ENV;
    const prevAllow = env.ALLOW_MOCK_RESET;

    try {
      env.NODE_ENV = 'production';
      delete env.ALLOW_MOCK_RESET;

      expect(isMockResetAllowed()).toBe(false);
      const res = await postMockReset();
      expect(res.status).toBe(403);
    } finally {
      env.NODE_ENV = prevNodeEnv;
      if (prevAllow === undefined) {
        delete env.ALLOW_MOCK_RESET;
      } else {
        env.ALLOW_MOCK_RESET = prevAllow;
      }
    }
  });

  it('rejects past move-in dates and host self-booking in createReservation', async () => {
    await expect(
      createReservation({
        propertyId: 16061,
        moveInDate: '2020-01-01',
        moveOutDate: '2020-02-05',
        guestName: 'Past Guest',
        guestEmail: 'past@example.com',
        userId: 1,
      })
    ).rejects.toThrow(/past/i);

    // User 3 owns Host 1 which owns Property 16061
    await expect(
      createReservation({
        propertyId: 16061,
        moveInDate: getUtcOffsetDateString(700),
        moveOutDate: getUtcOffsetDateString(735),
        guestName: 'Self Host',
        guestEmail: 'host@example.com',
        userId: 3,
      })
    ).rejects.toThrow(/cannot book their own apartment/i);
  });

  it('blocks host from cancelling confirmed bookings and serializes concurrent cancels', async () => {
    const created = await createReservation({
      propertyId: 16061, // Instant book -> confirmed
      moveInDate: getUtcOffsetDateString(750),
      moveOutDate: getUtcOffsetDateString(785),
      guestName: 'Concurrent Guest',
      guestEmail: 'concurrent@example.com',
      userId: 1,
    });
    createdReservationIds.push(created.id);

    await expect(
      updateReservationStatus(created.id, 'cancelled', 'Host tried to cancel', 'host')
    ).rejects.toThrow(/Hosts cannot cancel confirmed reservations/i);

    // Two concurrent guest cancellations: exactly one succeeds, one fails with invalid transition
    const results = await Promise.allSettled([
      updateReservationStatus(created.id, 'cancelled', 'First cancel', 'guest'),
      updateReservationStatus(created.id, 'cancelled', 'Second cancel', 'guest'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it('lazily expires overdue pending booking when fetched via getReservationByCode', async () => {
    const created = await createReservation({
      propertyId: 16060, // Request-to-book -> pending
      moveInDate: getUtcOffsetDateString(800),
      moveOutDate: getUtcOffsetDateString(835),
      guestName: 'Lazy Expiry Guest',
      guestEmail: 'expiry@example.com',
      userId: 1,
    });
    createdReservationIds.push(created.id);

    await db
      .update(reservations)
      .set({ respondBy: new Date(Date.now() - 60_000) })
      .where(eq(reservations.id, created.id));

    const fetched = await getReservationByCode(created.code);
    expect(fetched?.status).toBe('expired');
    expect(fetched?.paymentStatus).toBe('voided');
  });

  it('strips NUL bytes in search queries and enforces int4 / column length bounds cleanly', async () => {
    expect(await getUserById(9_999_999_999)).toBeNull();
    const unchangedUser = await updateUser(1, {});
    expect(unchangedUser.id).toBe(1);

    const unchangedLoc = await saveLocation({ id: 2241 });
    expect(unchangedLoc.id).toBe(2241);

    // Search with NUL byte must not trigger Postgres 22021 error
    await expect(listProperties({ city: 'Madrid\0test' })).resolves.toEqual([]);
    const spainWithNull = await listLocations({ country: 'Spain\0' });
    expect(spainWithNull.length).toBeGreaterThanOrEqual(3);

    // Non-existent property favorite returns clean domain error instead of raw Postgres 23503
    await expect(addFavorite(999_999, 1)).rejects.toThrow('Property not found.');

    // Location schema enforces column limits and finite coordinates
    expect(
      locationInputSchema.safeParse({
        city: 'Lisbon',
        name: 'Lisbon',
        country: 'Portugal',
        countryCode: 'TOOLONGCOUNTRYCODE',
      }).success
    ).toBe(false);
    expect(
      locationInputSchema.safeParse({
        city: 'Lisbon',
        name: 'Lisbon',
        country: 'Portugal',
        countryCode: 'PT',
        position: 9_999_999_999,
      }).success
    ).toBe(false);
  });

  it('hardens sanitizeHtml against meta/link/template/srcdoc/style-expression XSS and $& sequences', () => {
    const dirty = [
      '<p>Clean</p>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      '<link rel="stylesheet" href="https://evil.com/x.css">',
      '<template><script>alert(1)</script></template>',
      '<img src="/seed/property/prop-madrid-1.webp" srcset="javascript:alert(1)" style="background:url(javascript:alert(1))">',
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Tour $& $$ $1"></iframe>',
    ].join('');

    const cleaned = sanitizeHtml(dirty);
    expect(cleaned).toContain('<p>Clean</p>');
    expect(cleaned).not.toMatch(/<meta/i);
    expect(cleaned).not.toMatch(/<link/i);
    expect(cleaned).not.toMatch(/<template/i);
    expect(cleaned).not.toMatch(/javascript:/i);
    expect(cleaned).not.toMatch(/srcset=/i);
    expect(cleaned).toContain('title="Tour $&amp; $$ $1"');
  });

  it('serves HEAD /uploads/[...path] with image/webp and strict sandbox CSP', async () => {
    const png = await sharp({
      create: { width: 16, height: 16, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const saved = await saveUploadedBuffer(png);
    const req = new NextRequest(`http://localhost:3288${saved.url}`, { method: 'HEAD' });
    const res = await headUploadRoute(req, {
      params: Promise.resolve({ path: [saved.storageKey] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
