import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { db } from '@/lib/db/client';
import {
  hostProfiles,
  locations,
  properties,
  reservations,
  users,
  workstationAddons,
  workstationComponents,
} from '@/lib/db/schema';
import { switchRole, resetSession } from '@/lib/auth/session';
import { updateUserAction } from '@/app/admin/admin-actions';
import { reviewHostApplication } from '@/lib/api/hosts';
import { deleteLocation, saveLocation } from '@/lib/api/locations';
import {
  createAdminProperty,
  deleteProperty,
  listAdminPropertiesPaginated,
} from '@/lib/api/properties';
import { listAdminReservationsPaginated } from '@/lib/api/reservations';
import { listAdminUsersPaginated } from '@/lib/api/users';
import {
  deleteWorkstationAddon,
  deleteWorkstationComponent,
  saveWorkstationAddon,
  saveWorkstationComponent,
} from '@/lib/api/workstations';
import { sanitizeHtml } from '@/lib/validations/content';
import { BOOKING_RULES } from '@/content/booking-rules';
import { FAQS } from '@/content/faqs';
import { PARTNER_NETWORK_CONTENT } from '@/content/pages/partner-network';

function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

describe('Admin Business Logic & Data Integrity Suite (T8)', () => {
  beforeEach(() => {
    resetSession();
  });

  afterEach(() => {
    resetSession();
  });

  describe('Last-Admin & Self-Suspension Protection', () => {
    it('prevents self-suspension and demotion of the last active administrator', async () => {
      await switchRole('admin'); // Seeded admin id: 2 (admin@example.com)

      await expect(updateUserAction(2, { isActive: false })).rejects.toThrow(
        /cannot suspend your own active administrator account/i
      );

      await expect(updateUserAction(2, { role: 'guest' })).rejects.toThrow(
        /last remaining active administrator/i
      );

      // Verify adding a second active admin allows demoting the second admin, then re-enforces guard
      const uniqueEmail = `t8-admin-${Date.now()}@example.com`;
      const [secondAdmin] = await db
        .insert(users)
        .values({
          email: uniqueEmail,
          passwordHash: 'not-a-real-hash',
          firstName: 'Backup',
          lastName: 'Admin',
          role: 'admin',
          isActive: true,
        })
        .returning();

      try {
        const demoted = await updateUserAction(secondAdmin.id, { role: 'host' });
        expect(demoted.role).toBe('host');
        expect(demoted.passwordHash).toBe('');

        // Now user 2 is once again the last active admin
        await expect(updateUserAction(2, { role: 'host' })).rejects.toThrow(
          /last remaining active administrator/i
        );
      } finally {
        await db.delete(users).where(eq(users.id, secondAdmin.id));
      }
    });
  });

  describe('Host Suspension Reservation Cascade', () => {
    it('auto-cancels pending reservations while preserving confirmed and completed bookings', async () => {
      const suffix = Date.now().toString().slice(-6);
      const [tempUser] = await db
        .insert(users)
        .values({
          email: `t8-host-${suffix}@example.com`,
          passwordHash: 'not-a-real-hash',
          firstName: 'Suspend',
          lastName: 'Host',
          role: 'host',
          isActive: true,
        })
        .returning();

      let tempHostId: number | null = null;
      let tempPropertyId: number | null = null;
      const tempReservationIds: number[] = [];

      try {
        const [tempHost] = await db
          .insert(hostProfiles)
          .values({
            userId: tempUser.id,
            displayName: `T8 Suspend Host ${suffix}`,
            slug: `t8-suspend-host-${suffix}`,
            phone: '+34 600 000 000',
            cities: 'Madrid',
            portfolioSize: 1,
            bio: 'Temporary host for T8 suspension test.',
            status: 'approved',
            approvedAt: new Date(),
          })
          .returning();
        tempHostId = tempHost.id;

        const prop = await createAdminProperty({
          hostId: tempHost.id,
          title: `T8 Suspend Property ${suffix}`,
          city: 'Madrid',
          country: 'Spain',
          pricePerMonth: 260000,
          minimumStayNights: 30,
          status: 'published',
        });
        tempPropertyId = prop.id;

        const insertedReservations = await db
          .insert(reservations)
          .values([
            {
              code: `ND-T8P-${suffix}`,
              userId: 1,
              propertyId: prop.id,
              moveInDate: getOffsetDateStr(400),
              moveOutDate: getOffsetDateStr(430),
              nights: 30,
              monthlyRent: 260000,
              rentAmount: 260000,
              workstationFee: 0,
              totalAmount: 260000,
              commissionAmount: 26000,
              hostPayout: 234000,
              guestName: 'Pending Guest',
              guestEmail: 'pending-t8@example.com',
              status: 'pending',
              respondBy: new Date(Date.now() + 48 * 3600 * 1000),
              paymentStatus: 'authorized',
              paymentRef: `mock_txn_t8_pending_${suffix}`,
            },
            {
              code: `ND-T8C-${suffix}`,
              userId: 1,
              propertyId: prop.id,
              moveInDate: getOffsetDateStr(440),
              moveOutDate: getOffsetDateStr(470),
              nights: 30,
              monthlyRent: 260000,
              rentAmount: 260000,
              workstationFee: 0,
              totalAmount: 260000,
              commissionAmount: 26000,
              hostPayout: 234000,
              guestName: 'Confirmed Guest',
              guestEmail: 'confirmed-t8@example.com',
              status: 'confirmed',
              paymentStatus: 'captured',
              paymentRef: `mock_txn_t8_confirmed_${suffix}`,
            },
            {
              code: `ND-T8D-${suffix}`,
              userId: 1,
              propertyId: prop.id,
              moveInDate: getOffsetDateStr(-90),
              moveOutDate: getOffsetDateStr(-60),
              nights: 30,
              monthlyRent: 260000,
              rentAmount: 260000,
              workstationFee: 0,
              totalAmount: 260000,
              commissionAmount: 26000,
              hostPayout: 234000,
              guestName: 'Completed Guest',
              guestEmail: 'completed-t8@example.com',
              status: 'completed',
              paymentStatus: 'captured',
              paymentRef: `mock_txn_t8_completed_${suffix}`,
            },
          ])
          .returning();

        for (const r of insertedReservations) {
          tempReservationIds.push(r.id);
        }

        const suspendedHost = await reviewHostApplication(
          tempHost.id,
          'suspended',
          'Repeated policy violations'
        );
        expect(suspendedHost.status).toBe('suspended');
        expect(suspendedHost.rejectionReason).toBe('Repeated policy violations');

        const afterRows = await db
          .select()
          .from(reservations)
          .where(inArray(reservations.id, tempReservationIds));

        const byCode = new Map(afterRows.map((r) => [r.code, r]));

        const pendingAfter = byCode.get(`ND-T8P-${suffix}`);
        expect(pendingAfter?.status).toBe('cancelled');
        expect(pendingAfter?.cancelledBy).toBe('admin');
        expect(pendingAfter?.paymentStatus).toBe('voided');
        expect(pendingAfter?.rejectionReason).toBe('Repeated policy violations');

        const confirmedAfter = byCode.get(`ND-T8C-${suffix}`);
        expect(confirmedAfter?.status).toBe('confirmed');
        expect(confirmedAfter?.paymentStatus).toBe('captured');

        const completedAfter = byCode.get(`ND-T8D-${suffix}`);
        expect(completedAfter?.status).toBe('completed');
        expect(completedAfter?.paymentStatus).toBe('captured');
      } finally {
        if (tempReservationIds.length > 0) {
          await db.delete(reservations).where(inArray(reservations.id, tempReservationIds));
        }
        if (tempPropertyId != null) {
          await db.delete(properties).where(eq(properties.id, tempPropertyId));
        }
        if (tempHostId != null) {
          await db.delete(hostProfiles).where(eq(hostProfiles.id, tempHostId));
        }
        await db.delete(users).where(eq(users.id, tempUser.id));
      }
    });
  });

  describe('Delete Reference Integrity Guards', () => {
    it('blocks deleting a property, location, workstation component, or add-on with active references', async () => {
      const suffix = Date.now().toString().slice(-6);
      const compId = `t8-desk-${suffix}`;
      const addonId = `t8-addon-${suffix}`;

      let tempLocationId: number | null = null;
      let tempPropertyId: number | null = null;
      let tempReservationId: number | null = null;

      try {
        const createdLoc = await saveLocation({
          name: `T8City${suffix}`,
          city: `t8city-${suffix}`,
          slug: `t8city-${suffix}`,
          country: 'Spain',
          countryCode: 'ES',
          continent: 'Europe',
          description: '<p>Test destination</p>',
          isActive: true,
        });
        tempLocationId = createdLoc.id;

        const createdProp = await createAdminProperty({
          hostId: 1,
          locationId: createdLoc.id,
          title: `T8 Guard Property ${suffix}`,
          city: createdLoc.city,
          country: 'Spain',
          pricePerMonth: 250000,
          minimumStayNights: 30,
          status: 'published',
        });
        tempPropertyId = createdProp.id;

        await saveWorkstationComponent('desk', {
          id: compId,
          name: 'T8 Standing Desk',
          pricePerMonth: 45,
          isIncluded: false,
          description: 'Temporary desk for reference guard test.',
          isActive: true,
        });

        await saveWorkstationAddon({
          id: addonId,
          name: 'T8 Studio Mic',
          pricePerMonth: 25,
          description: 'Temporary add-on for reference guard test.',
          isActive: true,
        });

        const [res] = await db
          .insert(reservations)
          .values({
            code: `ND-T8G-${suffix}`,
            userId: 1,
            propertyId: createdProp.id,
            moveInDate: getOffsetDateStr(500),
            moveOutDate: getOffsetDateStr(530),
            nights: 30,
            monthlyRent: 250000,
            rentAmount: 250000,
            workstationFee: 7000,
            totalAmount: 257000,
            commissionAmount: 25000,
            hostPayout: 225000,
            guestName: 'Guard Test Guest',
            guestEmail: 'guard-t8@example.com',
            status: 'confirmed',
            paymentStatus: 'captured',
            workstationConfig: {
              packageId: 'custom',
              deskId: compId,
              addonIds: [addonId],
            },
          })
          .returning();
        tempReservationId = res.id;

        // 1. Property with reservation cannot be deleted
        await expect(deleteProperty(createdProp.id)).rejects.toThrow(
          /Cannot delete property with existing reservations/i
        );

        // 2. Location with property cannot be deleted
        await expect(deleteLocation(createdLoc.id)).rejects.toThrow(
          /Cannot delete destination with existing properties/i
        );

        // 3. Workstation component referenced in reservations.workstation_config cannot be deleted
        await expect(deleteWorkstationComponent('desk', compId)).rejects.toThrow(
          /Cannot delete workstation option referenced by existing reservations/i
        );

        // 4. Workstation add-on referenced in reservations.workstation_config cannot be deleted
        await expect(deleteWorkstationAddon(addonId)).rejects.toThrow(
          /Cannot delete workstation option referenced by existing reservations/i
        );
      } finally {
        if (tempReservationId != null) {
          await db.delete(reservations).where(eq(reservations.id, tempReservationId));
        }
        if (tempPropertyId != null) {
          await db.delete(properties).where(eq(properties.id, tempPropertyId));
        }
        if (tempLocationId != null) {
          await db.delete(locations).where(eq(locations.id, tempLocationId));
        }
        await db
          .delete(workstationComponents)
          .where(eq(workstationComponents.componentId, compId));
        await db.delete(workstationAddons).where(eq(workstationAddons.addonId, addonId));
      }
    });
  });

  describe('sanitizeHtml Security & Preservation', () => {
    it('strips scripts, event handlers, javascript:/data: URIs, and non-YouTube iframes', () => {
      const dirty = [
        '<p>Safe intro</p>',
        '<script>alert("xss")</script>',
        '<img src="/seed/property/prop-madrid-1.webp" onerror="alert(1)" onclick=\'steal()\' />',
        '<a href="javascript:alert(1)">Click</a>',
        '<a href="vbscript:msgbox(1)">VB</a>',
        '<a href="data:text/html,<script>alert(1)</script>">Data</a>',
        '<iframe src="https://evil.com/phish" width="600" height="400"></iframe>',
        '<object data="https://evil.com/x.swf"></object>',
        '<embed src="https://evil.com/x.swf" />',
      ].join('');

      const cleaned = sanitizeHtml(dirty);

      expect(cleaned).toContain('<p>Safe intro</p>');
      expect(cleaned).not.toMatch(/<script/i);
      expect(cleaned).not.toMatch(/onerror\s*=/i);
      expect(cleaned).not.toMatch(/onclick\s*=/i);
      expect(cleaned).not.toMatch(/javascript\s*:/i);
      expect(cleaned).not.toMatch(/vbscript\s*:/i);
      expect(cleaned).not.toMatch(/data\s*:\s*text\/html/i);
      expect(cleaned).not.toContain('evil.com');
      expect(cleaned).not.toMatch(/<iframe/i);
      expect(cleaned).not.toMatch(/<object/i);
      expect(cleaned).not.toMatch(/<embed/i);
    });

    it('preserves allowlisted YouTube embeds and leaves valid rich HTML untouched', () => {
      const validRichHtml =
        '<h2>Lisbon Guide</h2><p>Fast fiber and <strong>ergonomic desks</strong>.</p><ul><li>Chiado</li><li>Principe Real</li></ul><table><thead><tr><th>Area</th><th>Fiber</th></tr></thead><tbody><tr><td>Chiado</td><td>1 Gbps</td></tr></tbody></table><img src="/seed/property/prop-madrid-1.webp" alt="Workspace" />';
      expect(sanitizeHtml(validRichHtml)).toBe(validRichHtml);

      const ytEmbed =
        '<p>Tour:</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>';
      const cleanedYt = sanitizeHtml(ytEmbed);
      expect(cleanedYt).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(cleanedYt).toContain('<iframe');
      expect(cleanedYt).toContain('allowfullscreen');

      const ytNoCookie =
        '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>';
      expect(sanitizeHtml(ytNoCookie)).toContain(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
      );
    });
  });

  describe('SQL Pagination Contracts', () => {
    it('paginates properties, users, and reservations with accurate pageSize and total', async () => {
      const propPage1 = await listAdminPropertiesPaginated({ page: 1, pageSize: 5 });
      expect(propPage1.page).toBe(1);
      expect(propPage1.pageSize).toBe(5);
      expect(propPage1.items.length).toBeLessThanOrEqual(5);
      expect(propPage1.total).toBeGreaterThanOrEqual(propPage1.items.length);
      expect(propPage1.counts.all).toBe(propPage1.total);

      if (propPage1.total > 5) {
        const propPage2 = await listAdminPropertiesPaginated({ page: 2, pageSize: 5 });
        expect(propPage2.page).toBe(2);
        expect(propPage2.items.length).toBeLessThanOrEqual(5);
        const page1Ids = new Set(propPage1.items.map((p) => p.id));
        for (const item of propPage2.items) {
          expect(page1Ids.has(item.id)).toBe(false);
        }
      }

      const userPage1 = await listAdminUsersPaginated({ page: 1, pageSize: 2 });
      expect(userPage1.page).toBe(1);
      expect(userPage1.pageSize).toBe(2);
      expect(userPage1.items.length).toBeLessThanOrEqual(2);
      expect(userPage1.total).toBeGreaterThanOrEqual(userPage1.items.length);
      expect(userPage1.counts.all).toBe(userPage1.total);

      const resPage1 = await listAdminReservationsPaginated({ page: 1, pageSize: 2 });
      expect(resPage1.page).toBe(1);
      expect(resPage1.pageSize).toBe(2);
      expect(resPage1.items.length).toBeLessThanOrEqual(2);
      expect(resPage1.total).toBeGreaterThanOrEqual(resPage1.items.length);
      expect(resPage1.summary.totalCount).toBe(resPage1.counts.all);
    });
  });

  describe('Hardcoded Content Consistency with BOOKING_RULES', () => {
    it('keeps PARTNER_NETWORK_CONTENT and FAQS aligned with BOOKING_RULES constants', () => {
      const partnerSerialized = JSON.stringify(PARTNER_NETWORK_CONTENT);
      expect(partnerSerialized).toContain(`${BOOKING_RULES.commissionPercent}%`);
      expect(partnerSerialized).toContain(`${BOOKING_RULES.respondHours}`);
      expect(partnerSerialized).toContain(`${BOOKING_RULES.minimumStayNights}`);

      const faqsSerialized = JSON.stringify(FAQS);
      expect(faqsSerialized).toContain(`${BOOKING_RULES.minimumStayNights}`);
      expect(faqsSerialized).toContain(`${BOOKING_RULES.freeCancelDays}`);
      expect(faqsSerialized).toContain(`${BOOKING_RULES.respondHours}`);
    });
  });
});
