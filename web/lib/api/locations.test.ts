import { describe, it, expect } from 'vitest';
import {
  listLocations,
  getLocationBySlug,
  getLocationById,
  saveLocation,
  deleteLocation,
  reorderTopCities,
  listCategories,
  getCategoryBySlug,
} from './locations';
import { db } from '@/lib/db/client';
import { locations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Locations & Categories DB API Suite', () => {
  describe('listLocations', () => {
    it('returns only active locations by default, sorted by position ascending', async () => {
      const locs = await listLocations();
      expect(locs.length).toBe(34);
      expect(locs.every((l) => l.isActive !== false)).toBe(true);

      // Verify position order
      for (let i = 1; i < locs.length; i++) {
        expect((locs[i].position ?? 999)).toBeGreaterThanOrEqual(locs[i - 1].position ?? 0);
      }
    });

    it('filters locations by continent correctly', async () => {
      const europeLocs = await listLocations({ continent: 'Europe' });
      expect(europeLocs.length).toBeGreaterThan(0);
      expect(europeLocs.every((l) => l.continent.toLowerCase() === 'europe')).toBe(true);
    });

    it('filters locations by country correctly', async () => {
      const spainLocs = await listLocations({ country: 'Spain' });
      expect(spainLocs.length).toBeGreaterThanOrEqual(3);
      expect(spainLocs.every((l) => l.country.toLowerCase() === 'spain')).toBe(true);
    });

    it('supports sorting by name ascending', async () => {
      const locs = await listLocations({ sortBy: 'name' });
      expect(locs.length).toBe(34);
      for (let i = 1; i < locs.length; i++) {
        expect(locs[i].name.localeCompare(locs[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('includes inactive locations when includeInactive is true', async () => {
      // Temporarily set one location to inactive
      await db.update(locations).set({ isActive: false }).where(eq(locations.id, 1993));

      try {
        const activeOnly = await listLocations();
        expect(activeOnly.find((l) => l.id === 1993)).toBeUndefined();

        const allLocs = await listLocations({ includeInactive: true });
        const barcelona = allLocs.find((l) => l.id === 1993);
        expect(barcelona).toBeDefined();
        expect(barcelona?.isActive).toBe(false);
      } finally {
        await db.update(locations).set({ isActive: true }).where(eq(locations.id, 1993));
      }
    });
  });

  describe('getLocationBySlug', () => {
    it('finds location by direct slug (e.g. madrid)', async () => {
      const loc = await getLocationBySlug('madrid');
      expect(loc).not.toBeNull();
      expect(loc?.name).toBe('Madrid');
      expect(loc?.country).toBe('Spain');
    });

    it('finds location by slug with furnished-apartments- prefix', async () => {
      const loc = await getLocationBySlug('furnished-apartments-madrid');
      expect(loc).not.toBeNull();
      expect(loc?.name).toBe('Madrid');
    });

    it('handles case-insensitivity in slug lookup', async () => {
      const loc = await getLocationBySlug('FURNISHED-APARTMENTS-BARCELONA');
      expect(loc).not.toBeNull();
      expect(loc?.name).toBe('Barcelona');
    });

    it('returns null for non-existent slug or empty string', async () => {
      expect(await getLocationBySlug('non-existent-city-xyz')).toBeNull();
      expect(await getLocationBySlug('')).toBeNull();
      expect(await getLocationBySlug(undefined)).toBeNull();
    });
  });

  describe('getLocationById', () => {
    it('finds location by valid ID (e.g. Madrid = 2241)', async () => {
      const loc = await getLocationById(2241);
      expect(loc).not.toBeNull();
      expect(loc?.id).toBe(2241);
      expect(loc?.name).toBe('Madrid');
    });

    it('returns null for non-existent ID', async () => {
      expect(await getLocationById(999999)).toBeNull();
    });
  });

  describe('saveLocation', () => {
    it('updates an existing location when id is provided', async () => {
      const original = await getLocationById(2241);
      expect(original).not.toBeNull();

      try {
        const updated = await saveLocation({
          id: 2241,
          description: 'Updated Madrid test description',
        });
        expect(updated.id).toBe(2241);
        expect(updated.description).toBe('Updated Madrid test description');

        const fetched = await getLocationById(2241);
        expect(fetched?.description).toBe('Updated Madrid test description');
      } finally {
        if (original) {
          await saveLocation({
            id: 2241,
            description: original.description,
          });
        }
      }
    });

    it('creates a new location and shifts position if position <= 8', async () => {
      const testSlug = 'unit-test-oasis-city';
      let createdId: number | null = null;

      try {
        const newLoc = await saveLocation({
          name: 'Unit Test Oasis',
          city: 'Unit Test Oasis',
          slug: testSlug,
          country: 'Testland',
          countryCode: 'TL',
          continent: 'South America',
          position: 1,
        });

        expect(newLoc.id).toBeDefined();
        createdId = newLoc.id;
        expect(newLoc.name).toBe('Unit Test Oasis');
        expect(newLoc.position).toBe(1);

        // Previous position 1 should now be shifted to >= 2
        const barcelona = await getLocationById(1993);
        expect(barcelona?.position).toBeGreaterThanOrEqual(2);
      } finally {
        if (createdId) {
          await db.delete(locations).where(eq(locations.id, createdId));
        }
        // Restore Barcelona position to 1
        await db.update(locations).set({ position: 1 }).where(eq(locations.id, 1993));
      }
    });
  });

  describe('deleteLocation', () => {
    it('throws error when trying to delete location with existing properties', async () => {
      // Madrid has properties in seed (16060, 16061)
      await expect(deleteLocation(2241)).rejects.toThrow(
        'Cannot delete destination with existing properties. Please hide it instead.'
      );
    });

    it('successfully deletes a location with no properties', async () => {
      const newLoc = await saveLocation({
        name: 'Empty Island',
        city: 'Empty Island',
        slug: 'empty-island-test',
        country: 'Nowhere',
        countryCode: 'NW',
        continent: 'Oceania',
        propertiesCount: 0,
      });

      expect(newLoc.id).toBeDefined();
      const deleted = await deleteLocation(newLoc.id);
      expect(deleted).toBe(true);

      const check = await getLocationById(newLoc.id);
      expect(check).toBeNull();
    });
  });

  describe('reorderTopCities', () => {
    it('updates position of cities in batch transaction', async () => {
      const originalLocs = await listLocations();
      const firstTwo = [originalLocs[0].id, originalLocs[1].id];

      try {
        // Swap their order
        const reordered = await reorderTopCities([firstTwo[1], firstTwo[0]]);
        const item1 = reordered.find((l) => l.id === firstTwo[1]);
        const item0 = reordered.find((l) => l.id === firstTwo[0]);

        expect(item1?.position).toBe(1);
        expect(item0?.position).toBe(2);
      } finally {
        await reorderTopCities(originalLocs.map((l) => l.id));
      }
    });
  });

  describe('Categories DB API', () => {
    it('lists 6 seed categories ordered by position', async () => {
      const cats = await listCategories();
      expect(cats.length).toBe(6);
      expect(cats.map((c) => c.slug)).toContain('gym');
      expect(cats.map((c) => c.slug)).toContain('luxury');
    });

    it('finds category by slug', async () => {
      const cat = await getCategoryBySlug('gym');
      expect(cat).not.toBeNull();
      expect(cat?.name).toBe('Gym');
    });
  });
});
