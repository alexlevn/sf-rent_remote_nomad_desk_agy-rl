import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  workstationAddons,
  workstationPackages,
} from '@/lib/db/schema';
import {
  listWorkstations,
  getWorkstationPackageBySlug,
  saveWorkstationPackage,
  saveWorkstationComponent,
  deleteWorkstationComponent,
  saveWorkstationAddon,
  deleteWorkstationAddon,
} from './workstations';
import { calculateBookingTotal } from '@/lib/pricing';

describe('Workstations DB API Suite', () => {
  describe('listWorkstations', () => {
    it('returns active packages, 4 component groups, and 5 add-ons from PostgreSQL', async () => {
      const data = await listWorkstations();

      expect(data.packages.length).toBe(2);
      expect(data.packages[0].id).toBe('comfort');
      expect(data.packages[0].slug).toBe('comfort-base');
      expect(data.packages[0].pricePerMonth).toBe(0);
      expect(data.packages[0].isIncluded).toBe(true);

      expect(data.packages[1].id).toBe('pro');
      expect(data.packages[1].slug).toBe('pro-upgrade');
      expect(data.packages[1].pricePerMonth).toBe(15000);
      expect(data.packages[1].isIncluded).toBe(false);

      expect(data.components.desk.length).toBe(2);
      expect(data.components.chair.length).toBe(2);
      expect(data.components.monitor.length).toBe(2);
      expect(data.components.keyboardMouse.length).toBe(2);
      expect(data.addons.length).toBe(5);
    });

    it('filters out inactive workstation add-ons', async () => {
      await db
        .update(workstationAddons)
        .set({ isActive: false })
        .where(eq(workstationAddons.addonId, 'addon-stand'));

      try {
        const data = await listWorkstations();
        expect(data.addons.find((a) => a.id === 'addon-stand')).toBeUndefined();
        expect(data.addons.length).toBe(4);
      } finally {
        await db
          .update(workstationAddons)
          .set({ isActive: true })
          .where(eq(workstationAddons.addonId, 'addon-stand'));
      }
    });
  });

  describe('getWorkstationPackageBySlug', () => {
    it('finds package by slug and by short ID alias', async () => {
      const bySlug = await getWorkstationPackageBySlug('pro-upgrade');
      expect(bySlug).not.toBeNull();
      expect(bySlug?.id).toBe('pro');
      expect(bySlug?.pricePerMonth).toBe(15000);

      const byAlias = await getWorkstationPackageBySlug('PRO');
      expect(byAlias).not.toBeNull();
      expect(byAlias?.slug).toBe('pro-upgrade');

      const comfort = await getWorkstationPackageBySlug('comfort');
      expect(comfort?.slug).toBe('comfort-base');
    });

    it('returns null for unknown or empty slug', async () => {
      expect(await getWorkstationPackageBySlug('non-existent-pkg')).toBeNull();
      expect(await getWorkstationPackageBySlug('')).toBeNull();
    });
  });

  describe('saveWorkstationPackage', () => {
    it('updates existing package price and restores cleanly', async () => {
      const original = await getWorkstationPackageBySlug('pro-upgrade');
      expect(original).not.toBeNull();

      try {
        const updated = await saveWorkstationPackage({
          id: 'pro',
          pricePerMonth: 17000,
        });
        expect(updated.id).toBe('pro');
        expect(updated.pricePerMonth).toBe(17000);

        const fetched = await getWorkstationPackageBySlug('pro-upgrade');
        expect(fetched?.pricePerMonth).toBe(17000);
      } finally {
        if (original) {
          await saveWorkstationPackage({
            id: 'pro',
            pricePerMonth: original.pricePerMonth,
          });
        }
      }
    });

    it('inserts a new package when slug does not exist', async () => {
      const slug = 'unit-test-studio-pack';
      try {
        const created = await saveWorkstationPackage({
          id: slug,
          slug,
          name: 'Studio Creator Pack',
          pricePerMonth: 22000,
          isIncluded: false,
          description: 'Dual 5K displays and audio interface.',
          features: ['Dual 5K displays', 'Studio audio'],
        });

        expect(created.slug).toBe(slug);
        expect(created.pricePerMonth).toBe(22000);
        expect(created.features).toEqual(['Dual 5K displays', 'Studio audio']);
      } finally {
        await db
          .delete(workstationPackages)
          .where(eq(workstationPackages.slug, slug));
      }
    });

    it('rejects negative monthly price via Zod validation', async () => {
      await expect(
        saveWorkstationPackage({ id: 'pro', pricePerMonth: -500 })
      ).rejects.toThrow();
    });
  });

  describe('Workstation Components CRUD', () => {
    it('creates, updates, and deletes a hardware component option', async () => {
      const testId = 'mon-unit-test-5k';
      try {
        const created = await saveWorkstationComponent('monitor', {
          id: testId,
          name: 'Apple Studio Display 5K',
          pricePerMonth: 6500,
          isIncluded: false,
          description: '27-inch 5K Retina display.',
        });
        expect(created.id).toBe(testId);
        expect(created.pricePerMonth).toBe(6500);
        expect(created.description).toBe('27-inch 5K Retina display.');

        const updated = await saveWorkstationComponent('monitor', {
          id: testId,
          pricePerMonth: 7000,
        });
        expect(updated.name).toBe('Apple Studio Display 5K');
        expect(updated.pricePerMonth).toBe(7000);
        expect(updated.description).toBe('27-inch 5K Retina display.');

        const deleted = await deleteWorkstationComponent('monitor', testId);
        expect(deleted).toBe(true);

        const deletedAgain = await deleteWorkstationComponent('monitor', testId);
        expect(deletedAgain).toBe(false);
      } finally {
        await deleteWorkstationComponent('monitor', testId);
      }
    });
  });

  describe('Workstation Add-ons CRUD', () => {
    it('creates, updates, and deletes an accessory add-on', async () => {
      const testId = 'addon-unit-test-dock';
      try {
        const created = await saveWorkstationAddon({
          id: testId,
          name: 'Thunderbolt 4 Dock',
          pricePerMonth: 1200,
          description: 'Single cable 96W charging dock.',
        });
        expect(created.id).toBe(testId);
        expect(created.pricePerMonth).toBe(1200);

        const updated = await saveWorkstationAddon({
          id: testId,
          pricePerMonth: 1500,
        });
        expect(updated.name).toBe('Thunderbolt 4 Dock');
        expect(updated.pricePerMonth).toBe(1500);

        const deleted = await deleteWorkstationAddon(testId);
        expect(deleted).toBe(true);
        expect(await deleteWorkstationAddon(testId)).toBe(false);
      } finally {
        await deleteWorkstationAddon(testId);
      }
    });
  });

  describe('Pricing parity with calculateBookingTotal (D18)', () => {
    it('computes identical USD cents fee for DB-loaded 4K monitor + Aeron chair', async () => {
      const data = await listWorkstations();
      const mon4k = data.components.monitor.find((m) => m.id === 'mon-4k-ultrawide');
      const aeron = data.components.chair.find((c) => c.id === 'chair-aeron');

      expect(mon4k?.pricePerMonth).toBe(4000);
      expect(aeron?.pricePerMonth).toBe(4500);

      const monthlyEURCents = (mon4k?.pricePerMonth ?? 0) + (aeron?.pricePerMonth ?? 0);
      expect(monthlyEURCents).toBe(8500);

      const breakdown = calculateBookingTotal(250000, 30, monthlyEURCents);
      // 8500 EUR cents * 1.08 = 9180 USD cents
      expect(breakdown.workstationMonthlyUSD).toBe(9180);
      expect(breakdown.workstationFeeUSD).toBe(9180);
      expect(breakdown.totalAmountUSD).toBe(250000 + 9180);
    });
  });
});
