import { describe, it, expect, afterEach } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { blockedDates, reservations } from '@/lib/db/schema';
import {
  listReservations,
  getReservationByCode,
  createReservation,
  updateReservationStatus,
  listBlockedDates,
  addBlockedDate,
  deleteBlockedDate,
} from './reservations';
import { switchRole, getCurrentUser } from '@/lib/auth/session';

function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

describe('Reservations & Availability PostgreSQL API Layer', () => {
  const createdReservationIds: number[] = [];
  const createdBlockedDateIds: number[] = [];

  afterEach(async () => {
    // Delete only rows created by this test suite so parallel Vitest files remain isolated
    if (createdReservationIds.length > 0) {
      const ids = createdReservationIds.splice(0);
      await db.delete(reservations).where(inArray(reservations.id, ids));
    }
    if (createdBlockedDateIds.length > 0) {
      const ids = createdBlockedDateIds.splice(0);
      await db.delete(blockedDates).where(inArray(blockedDates.id, ids));
    }
  });

  it('lists seed reservations (ND-SEED1 to ND-SEED6)', async () => {
    const list = await listReservations();
    expect(list.length).toBeGreaterThanOrEqual(6);
    const codes = list.map((r) => r.code);
    expect(codes).toContain('ND-SEED1');
    expect(codes).toContain('ND-SEED2');
  });

  it('filters reservations by status and user', async () => {
    const pendingList = await listReservations({ status: 'pending' });
    expect(pendingList.some((r) => r.code === 'ND-SEED1')).toBe(true);

    const demoUserReservations = await listReservations({ userId: 1 });
    expect(demoUserReservations.length).toBeGreaterThanOrEqual(6);
  });

  it('creates an instant booking reservation in Postgres (property 16061)', async () => {
    // Use far-future T+420..T+450 window to avoid colliding with parallel test suites
    const moveInDate = getOffsetDateStr(420);
    const moveOutDate = getOffsetDateStr(450);

    const res = await createReservation({
      propertyId: 16061,
      moveInDate,
      moveOutDate,
      guestName: 'Alex Traveler',
      guestEmail: 'alex@example.com',
      userId: 1,
    });
    createdReservationIds.push(res.id);

    expect(res.code).toMatch(/^ND-\d{5}$/);
    expect(res.status).toBe('confirmed');
    expect(res.paymentStatus).toBe('captured');
    expect(res.paymentRef).toMatch(/^mock_txn_/);
    expect(res.nights).toBe(30);
    expect(res.rentAmount).toBe(285000);
    expect(res.totalAmount).toBe(285000);
    expect(res.commissionAmount).toBe(28500);
    expect(res.hostPayout).toBe(256500);

    // Verify persisted in PostgreSQL
    const persisted = await getReservationByCode(res.code);
    expect(persisted).not.toBeNull();
    expect(persisted?.id).toBe(res.id);
    expect(persisted?.status).toBe('confirmed');
  });

  it('creates a request-to-book reservation in Postgres (property 16060)', async () => {
    const moveInDate = getOffsetDateStr(420);
    const moveOutDate = getOffsetDateStr(450);

    const res = await createReservation({
      propertyId: 16060,
      moveInDate,
      moveOutDate,
      guestName: 'Request Nomad',
      guestEmail: 'nomad@example.com',
      workstationMonthlyEUR: 15000, // Pro upgrade €150/mo
    });
    createdReservationIds.push(res.id);

    expect(res.status).toBe('pending');
    expect(res.paymentStatus).toBe('authorized');
    expect(res.respondBy).not.toBeNull();
    // Rent: 1,200,000 + Workstation USD: 16,200 = 1,216,200 cents
    expect(res.rentAmount).toBe(1200000);
    expect(res.workstationFee).toBe(16200);
    expect(res.totalAmount).toBe(1216200);
    expect(res.commissionAmount).toBe(120000);
    expect(res.hostPayout).toBe(1080000);

    const persisted = await getReservationByCode(res.code);
    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe('pending');
  });

  it('rejects reservation shorter than minimum stay (30 nights)', async () => {
    const moveInDate = getOffsetDateStr(420);
    const moveOutDate = getOffsetDateStr(435); // 15 nights

    await expect(
      createReservation({
        propertyId: 16061,
        moveInDate,
        moveOutDate,
        guestName: 'Short Stay',
        guestEmail: 'short@example.com',
      })
    ).rejects.toThrow(/Minimum stay/);
  });

  it('rejects reservation overlapping blocked dates (property 16061 has T+55..T+60 blocked)', async () => {
    const moveInDate = getOffsetDateStr(50);
    const moveOutDate = getOffsetDateStr(80);

    await expect(
      createReservation({
        propertyId: 16061,
        moveInDate,
        moveOutDate,
        guestName: 'Overlap Stay',
        guestEmail: 'overlap@example.com',
      })
    ).rejects.toThrow(/blocked by host/);
  });

  it('prevents concurrent double-booking on the same dates via transaction lock + exclusion constraint (D28, Risk #7)', async () => {
    const moveInDate = getOffsetDateStr(460);
    const moveOutDate = getOffsetDateStr(490);

    const results = await Promise.allSettled([
      createReservation({
        propertyId: 16061,
        moveInDate,
        moveOutDate,
        guestName: 'Nomad One',
        guestEmail: 'nomad1@example.com',
        userId: 1,
      }),
      createReservation({
        propertyId: 16061,
        moveInDate,
        moveOutDate,
        guestName: 'Nomad Two',
        guestEmail: 'nomad2@example.com',
        userId: 1,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    for (const item of fulfilled) {
      createdReservationIds.push(item.value.id);
    }

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
      'These dates were just booked. Please choose different dates.'
    );
  });

  it('lazily expires overdue pending reservations inside createReservation transaction (Risk #9)', async () => {
    const moveInDate = getOffsetDateStr(500);
    const moveOutDate = getOffsetDateStr(530);

    // Create a pending reservation on 16060 and backdate its respondBy to the past
    const stale = await createReservation({
      propertyId: 16060,
      moveInDate,
      moveOutDate,
      guestName: 'Stale Requester',
      guestEmail: 'stale@example.com',
      userId: 1,
    });
    createdReservationIds.push(stale.id);
    expect(stale.status).toBe('pending');

    await db
      .update(reservations)
      .set({ respondBy: new Date(Date.now() - 3600 * 1000) })
      .where(eq(reservations.id, stale.id));

    // New booking on the exact same dates should succeed by expiring the stale hold
    const fresh = await createReservation({
      propertyId: 16060,
      moveInDate,
      moveOutDate,
      guestName: 'Fresh Requester',
      guestEmail: 'fresh@example.com',
      userId: 1,
    });
    createdReservationIds.push(fresh.id);
    expect(fresh.status).toBe('pending');

    const staleAfter = await getReservationByCode(stale.code);
    expect(staleAfter?.status).toBe('expired');
    expect(staleAfter?.paymentStatus).toBe('voided');
  });

  it('enforces cancellation rules: pending -> voided, confirmed >=14d -> refunded, confirmed <14d blocked for guest but allowed for admin', async () => {
    // 1. Guest cancels pending reservation -> voided
    const pendingRes = await createReservation({
      propertyId: 16060,
      moveInDate: getOffsetDateStr(540),
      moveOutDate: getOffsetDateStr(570),
      guestName: 'Pending Cancel Guest',
      guestEmail: 'pending-cancel@example.com',
      userId: 1,
    });
    createdReservationIds.push(pendingRes.id);

    const cancelledPending = await updateReservationStatus(
      pendingRes.id,
      'cancelled',
      'Plans changed',
      'guest'
    );
    expect(cancelledPending.status).toBe('cancelled');
    expect(cancelledPending.paymentStatus).toBe('voided');
    expect(cancelledPending.cancelledBy).toBe('guest');

    // 2. Guest cancels confirmed reservation >= 14 days away -> refunded
    const confirmedFar = await createReservation({
      propertyId: 16061,
      moveInDate: getOffsetDateStr(540),
      moveOutDate: getOffsetDateStr(570),
      guestName: 'Far Cancel Guest',
      guestEmail: 'far-cancel@example.com',
      userId: 1,
    });
    createdReservationIds.push(confirmedFar.id);

    const cancelledFar = await updateReservationStatus(
      confirmedFar.id,
      'cancelled',
      'Schedule shift',
      'guest'
    );
    expect(cancelledFar.status).toBe('cancelled');
    expect(cancelledFar.paymentStatus).toBe('refunded');

    // 3. Confirmed reservation < 14 days away: blocked for guest, allowed for admin
    const nearBooking = await createReservation({
      propertyId: 18001,
      moveInDate: getOffsetDateStr(5),
      moveOutDate: getOffsetDateStr(35),
      guestName: 'Near Cancel Guest',
      guestEmail: 'near-cancel@example.com',
      userId: 1,
    });
    createdReservationIds.push(nearBooking.id);

    const confirmedNear =
      nearBooking.status === 'confirmed'
        ? nearBooking
        : await updateReservationStatus(nearBooking.id, 'confirmed');
    await expect(
      updateReservationStatus(confirmedNear.id, 'cancelled', 'Too late', 'guest')
    ).rejects.toThrow(/at least 14 days before move-in/);

    const adminCancelled = await updateReservationStatus(
      confirmedNear.id,
      'cancelled',
      'Admin intervention',
      'admin'
    );
    expect(adminCancelled.status).toBe('cancelled');
    expect(adminCancelled.cancelledBy).toBe('admin');
    expect(adminCancelled.paymentStatus).toBe('refunded');
  });

  it('updates reservation status lifecycle (accept, cancel, reject)', async () => {
    // Use a dedicated reservation instead of mutating shared ND-SEED1 across parallel suites
    const created = await createReservation({
      propertyId: 16060,
      moveInDate: getOffsetDateStr(580),
      moveOutDate: getOffsetDateStr(610),
      guestName: 'Lifecycle Guest',
      guestEmail: 'lifecycle@example.com',
      userId: 1,
    });
    createdReservationIds.push(created.id);

    // Host accepts pending reservation
    const accepted = await updateReservationStatus(created.id, 'confirmed');
    expect(accepted.status).toBe('confirmed');
    expect(accepted.paymentStatus).toBe('captured');

    // Guest cancels reservation (moveIn is T+580 >= 14 days)
    const cancelled = await updateReservationStatus(
      created.id,
      'cancelled',
      undefined,
      'guest'
    );
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledBy).toBe('guest');
    expect(cancelled.paymentStatus).toBe('refunded');
  });

  it('manages blocked dates (list, add, delete)', async () => {
    const initBlocked = await listBlockedDates(16061);
    expect(initBlocked.length).toBeGreaterThanOrEqual(1);

    const startDate = getOffsetDateStr(620);
    const endDate = getOffsetDateStr(625);

    const created = await addBlockedDate({
      propertyId: 16061,
      startDate,
      endDate,
      reason: 'Deep Cleaning',
    });
    createdBlockedDateIds.push(created.id);
    expect(created.id).toBeGreaterThan(2);

    const afterAdd = await listBlockedDates(16061);
    expect(afterAdd.some((b) => b.id === created.id)).toBe(true);

    const deleted = await deleteBlockedDate(created.id);
    expect(deleted).toBe(true);

    const afterDel = await listBlockedDates(16061);
    expect(afterDel.some((b) => b.id === created.id)).toBe(false);
  });

  it('rejects blocking dates that overlap existing pending or confirmed reservation (AC-HOST-6)', async () => {
    // 16060 has pending booking ND-SEED1 at T+40..T+70
    const startDate = getOffsetDateStr(45);
    const endDate = getOffsetDateStr(55);

    await expect(
      addBlockedDate({
        propertyId: 16060,
        startDate,
        endDate,
        reason: 'Maintenance',
      })
    ).rejects.toThrow('These dates overlap an existing booking');
  });

  it('switches user session roles cleanly', async () => {
    const guestUser = await switchRole('guest');
    expect(guestUser.role).toBe('guest');
    expect(guestUser.email).toBe('demo@example.com');

    const hostUser = await switchRole('host');
    expect(hostUser.role).toBe('host');
    expect(hostUser.email).toBe('host@example.com');

    const adminUser = await switchRole('admin');
    expect(adminUser.role).toBe('admin');
    expect(adminUser.email).toBe('admin@example.com');

    const curr = await getCurrentUser();
    expect(curr?.id).toBe(adminUser.id);
  });
});
