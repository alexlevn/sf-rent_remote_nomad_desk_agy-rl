import { describe, it, expect, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hostProfiles, reservations, users } from '@/lib/db/schema';
import {
  applyHost,
  getHostBySlug,
  getHostByUserId,
  getHostProfile,
  listHostApplications,
  listHosts,
  reviewHostApplication,
  updateHostProfile,
} from '@/lib/api/hosts';
import {
  deleteProperty,
  listHostListings,
  saveHostListing,
} from '@/lib/api/properties';
import {
  addBlockedDate,
  deleteBlockedDate,
  getReservationByCode,
  listBlockedDates,
  updateReservationStatus,
} from '@/lib/api/reservations';

function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

describe('Host Portal DB Integration & Security (T11)', () => {
  afterAll(async () => {
    // Ensure seed user 1 remains clean after test suite
    await db.delete(hostProfiles).where(eq(hostProfiles.userId, 1));
    await db.update(users).set({ role: 'guest' }).where(eq(users.id, 1));
  });

  it('reads seeded host profiles by id, userId, slug, and pending queue', async () => {
    const hosts = await listHosts();
    expect(hosts.length).toBeGreaterThanOrEqual(3);

    const host1 = await getHostProfile(1);
    expect(host1).not.toBeNull();
    expect(host1?.status).toBe('approved');

    const byUser = await getHostByUserId(host1!.userId);
    expect(byUser?.id).toBe(1);

    const bySlug = await getHostBySlug(host1!.slug);
    expect(bySlug?.id).toBe(1);

    const pendingApps = await listHostApplications();
    expect(pendingApps.some((h) => h.status === 'pending')).toBe(true);
  });

  it('handles applyHost, updateHostProfile, and reviewHostApplication lifecycle', async () => {
    let createdHostId: number | null = null;
    try {
      const applied = await applyHost({
        userId: 1,
        displayName: 'T11 Test Stays',
        phone: '+34 611 222 333',
        website: 'https://t11.example.com',
        cities: 'Madrid, Lisbon',
        portfolioSize: 6,
        bio: 'Dedicated workspaces for remote engineers.',
        termsAccepted: true,
      });
      createdHostId = applied.id;

      expect(applied.status).toBe('pending');
      expect(applied.userId).toBe(1);

      const updated = await updateHostProfile(applied.id, {
        bio: 'Updated bio with 1Gbps fiber.',
        portfolioSize: 8,
      });
      expect(updated.bio).toBe('Updated bio with 1Gbps fiber.');
      expect(updated.portfolioSize).toBe(8);

      const approved = await reviewHostApplication(applied.id, 'approved');
      expect(approved.status).toBe('approved');
      expect(approved.approvedAt).not.toBeNull();

      // Associated user role must be elevated to 'host'
      const [elevatedUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, 1))
        .limit(1);
      expect(elevatedUser?.role).toBe('host');

      const suspended = await reviewHostApplication(
        applied.id,
        'suspended',
        'Policy audit'
      );
      expect(suspended.status).toBe('suspended');
      expect(suspended.rejectionReason).toBe('Policy audit');
    } finally {
      if (createdHostId != null) {
        await db.delete(hostProfiles).where(eq(hostProfiles.id, createdHostId));
      }
      await db.update(users).set({ role: 'guest' }).where(eq(users.id, 1));
    }
  });

  it('enforces listing ownership (IDOR) and blocks host self-publishing', async () => {
    let createdId: number | null = null;
    try {
      // Host cannot self-publish on creation
      await expect(
        saveHostListing(1, {
          title: 'Attempted Self Publish',
          city: 'Madrid',
          status: 'published',
        })
      ).rejects.toThrow(/cannot publish/i);

      const created = await saveHostListing(1, {
        title: 'T11 Host Listing Draft',
        city: 'Madrid',
        pricePerMonth: 290000,
        status: 'pending_review',
      });
      createdId = created.id;
      expect(created.status).toBe('pending_review');
      expect(created.hostId).toBe(1);

      // Host cannot self-publish on update
      await expect(
        saveHostListing(1, {
          id: created.id,
          status: 'published',
        })
      ).rejects.toThrow(/cannot publish/i);

      // IDOR: Host 2 cannot edit Host 1's listing
      await expect(
        saveHostListing(2, {
          id: created.id,
          title: 'Cross-Host Edit Attempt',
        })
      ).rejects.toThrow(/Unauthorized/);

      const host1List = await listHostListings(1);
      expect(host1List.some((p) => p.id === created.id)).toBe(true);
      const host2List = await listHostListings(2);
      expect(host2List.some((p) => p.id === created.id)).toBe(false);
    } finally {
      if (createdId != null) {
        await deleteProperty(createdId);
      }
    }
  });

  it('validates blocked dates, rejects booking overlap (AC-HOST-6), and prevents IDOR', async () => {
    // Invalid date range
    await expect(
      addBlockedDate(
        {
          propertyId: 16061,
          startDate: getOffsetDateStr(200),
          endDate: getOffsetDateStr(195),
          reason: 'Invalid range',
        },
        { hostId: 1 }
      )
    ).rejects.toThrow('End date must be after start date');

    // Overlap with confirmed booking ND-SEED2 on property 16061 (T+20..T+50)
    await expect(
      addBlockedDate(
        {
          propertyId: 16061,
          startDate: getOffsetDateStr(25),
          endDate: getOffsetDateStr(35),
          reason: 'Overlap booking',
        },
        { hostId: 1 }
      )
    ).rejects.toThrow('These dates overlap an existing booking');

    // IDOR: Host 2 cannot block dates on Host 1's property 16061
    await expect(
      addBlockedDate(
        {
          propertyId: 16061,
          startDate: getOffsetDateStr(250),
          endDate: getOffsetDateStr(260),
          reason: 'IDOR block',
        },
        { hostId: 2 }
      )
    ).rejects.toThrow(/Unauthorized/);

    // Valid block, duplicate block rejection, IDOR delete rejection, then valid delete
    const created = await addBlockedDate(
      {
        propertyId: 16061,
        startDate: getOffsetDateStr(250),
        endDate: getOffsetDateStr(260),
        reason: 'Owner Maintenance',
      },
      { hostId: 1 }
    );

    try {
      const list = await listBlockedDates(16061);
      expect(list.some((b) => b.id === created.id)).toBe(true);

      // Overlapping existing blocked range rejected
      await expect(
        addBlockedDate(
          {
            propertyId: 16061,
            startDate: getOffsetDateStr(255),
            endDate: getOffsetDateStr(265),
          },
          { hostId: 1 }
        )
      ).rejects.toThrow(/overlaps with an existing blocked date range/i);

      // IDOR: Host 2 cannot delete Host 1's blocked date
      await expect(
        deleteBlockedDate(created.id, { hostId: 2 })
      ).rejects.toThrow(/Unauthorized/);
    } finally {
      const removed = await deleteBlockedDate(created.id, { hostId: 1 });
      expect(removed).toBe(true);
    }
  });

  it('handles reservation accept/reject, enforces rejection reason, IDOR, and 48h expiry', async () => {
    // Insert a dedicated test reservation far in the future so parallel tests using ND-SEED1 never collide
    const testCode = `ND-T11-${Date.now().toString().slice(-5)}`;
    const [inserted] = await db
      .insert(reservations)
      .values({
        code: testCode,
        userId: 1,
        propertyId: 16060,
        moveInDate: getOffsetDateStr(320),
        moveOutDate: getOffsetDateStr(350),
        nights: 30,
        monthlyRent: 285000,
        rentAmount: 285000,
        workstationFee: 0,
        totalAmount: 285000,
        commissionAmount: 28500,
        hostPayout: 256500,
        guestName: 'T11 Test Guest',
        guestEmail: 't11-guest@example.com',
        status: 'pending',
        respondBy: new Date(Date.now() + 48 * 3600 * 1000),
        paymentStatus: 'authorized',
        paymentRef: 'mock_txn_t11_test',
      })
      .returning();

    try {
      // IDOR: Host 2 cannot accept Host 1's reservation
      await expect(
        updateReservationStatus(inserted.id, 'confirmed', undefined, undefined, {
          hostId: 2,
        })
      ).rejects.toThrow(/Unauthorized/);

      // Reject requires non-empty reason (AC-HOST-5)
      await expect(
        updateReservationStatus(inserted.id, 'rejected', '   ', 'host', {
          hostId: 1,
        })
      ).rejects.toThrow(/Rejection reason is required/i);

      // Host 1 accepts pending reservation (AC-HOST-4)
      const confirmed = await updateReservationStatus(
        inserted.id,
        'confirmed',
        undefined,
        undefined,
        { hostId: 1 }
      );
      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.paymentStatus).toBe('captured');

      // Reset to pending and test Host 1 reject with reason (AC-HOST-5)
      await db
        .update(reservations)
        .set({
          status: 'pending',
          paymentStatus: 'authorized',
          rejectionReason: null,
          respondBy: new Date(Date.now() + 48 * 3600 * 1000),
        })
        .where(eq(reservations.id, inserted.id));

      const rejected = await updateReservationStatus(
        inserted.id,
        'rejected',
        'Scheduled plumbing repair',
        'host',
        { hostId: 1 }
      );
      expect(rejected.status).toBe('rejected');
      expect(rejected.paymentStatus).toBe('voided');
      expect(rejected.rejectionReason).toBe('Scheduled plumbing repair');

      // Test 48h expiry guard (Risk #9): accepting an overdue pending booking fails and marks expired
      await db
        .update(reservations)
        .set({
          status: 'pending',
          paymentStatus: 'authorized',
          rejectionReason: null,
          respondBy: new Date(Date.now() - 3600 * 1000),
        })
        .where(eq(reservations.id, inserted.id));

      await expect(
        updateReservationStatus(inserted.id, 'confirmed', undefined, undefined, {
          hostId: 1,
        })
      ).rejects.toThrow(/expired/i);

      const afterExpiry = await getReservationByCode(testCode);
      expect(afterExpiry?.status).toBe('expired');
      expect(afterExpiry?.paymentStatus).toBe('voided');
    } finally {
      await db.delete(reservations).where(eq(reservations.id, inserted.id));
    }
  });
});
