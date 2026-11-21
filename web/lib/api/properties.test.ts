import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { favorites, hostProfiles, properties } from '@/lib/db/schema';
import {
  listProperties,
  getPropertyBySlug,
  getPropertyById,
  listHostListings,
  saveHostListing,
  updatePropertyStatus,
  updateProperty,
  reorderFeaturedProperties,
  deleteProperty,
} from './properties';
import {
  addFavorite,
  isPropertyFavorite,
  listUserFavoriteIds,
  listUserFavoriteProperties,
  removeFavorite,
  setUserFavorites,
  toggleFavorite,
} from './favorites';

function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

describe('Properties & Favorites DB API Suite', () => {
  it('returns all 8 published seed properties by default', async () => {
    const list = await listProperties();
    expect(list).toHaveLength(8);
    list.forEach((p) => {
      expect(p.status).toBe('published');
      expect(p.pricePerMonth).toBeGreaterThan(0);
      expect(p.images.length).toBeGreaterThan(0);
    });
  });

  it('filters properties by city name case-insensitively and by locationId', async () => {
    const madridProps = await listProperties({ city: 'madrid' });
    expect(madridProps).toHaveLength(2);
    madridProps.forEach((p) => expect(p.city.toLowerCase()).toBe('madrid'));

    const limaProps = await listProperties({ city: 'LIMA' });
    expect(limaProps).toHaveLength(2);
    limaProps.forEach((p) => expect(p.city.toLowerCase()).toBe('lima'));

    const byLocationId = await listProperties({ locationId: 2241 }); // Madrid
    expect(byLocationId).toHaveLength(2);
    byLocationId.forEach((p) => expect(p.city).toBe('Madrid'));
  });

  it('filters properties by minimum and exact bedrooms', async () => {
    const multiBedroom = await listProperties({ bedrooms: 2 });
    expect(multiBedroom.length).toBeGreaterThan(0);
    multiBedroom.forEach((p) => expect(p.bedrooms).toBeGreaterThanOrEqual(2));

    const exactTwo = await listProperties({ bedrooms: 2, exactBedrooms: true });
    expect(exactTwo.length).toBeGreaterThan(0);
    exactTwo.forEach((p) => expect(p.bedrooms).toBe(2));
  });

  it('filters properties by price range and amenities', async () => {
    const midRange = await listProperties({ minPrice: 150000, maxPrice: 250000 });
    midRange.forEach((p) => {
      expect(p.pricePerMonth).toBeGreaterThanOrEqual(150000);
      expect(p.pricePerMonth).toBeLessThanOrEqual(250000);
    });

    const withKitchenAndWorkstation = await listProperties({
      amenities: ['kitchen', 'workstation'],
    });
    expect(withKitchenAndWorkstation.length).toBeGreaterThan(0);
    withKitchenAndWorkstation.forEach((p) => {
      expect(p.kitchen).toBe(true);
      expect(p.workstation.hasWorkstation).toBe(true);
    });
  });

  it('filters properties by booking mode (Direct vs Request)', async () => {
    const instantProps = await listProperties({ isDirectBooking: true });
    expect(instantProps).toHaveLength(7);

    const requestProps = await listProperties({ isDirectBooking: false });
    expect(requestProps).toHaveLength(1);
    expect(requestProps[0].id).toBe(16060);
  });

  it('filters properties by verified minimum Wi-Fi speed', async () => {
    const fastWifi = await listProperties({ minWifiSpeed: 500 });
    expect(fastWifi.length).toBeGreaterThan(0);
    fastWifi.forEach((p) => {
      expect(p.workstation.wifiSpeed).toBeGreaterThanOrEqual(500);
    });
  });

  it('excludes properties overlapping confirmed/pending reservations or blocked_dates (AC-LIST-5)', async () => {
    // ND-SEED2 (property 16061) is confirmed T+20..T+50
    const overlapReservation = await listProperties({
      city: 'Madrid',
      moveIn: getOffsetDateStr(25),
      moveOut: getOffsetDateStr(35),
    });
    expect(overlapReservation.map((p) => p.id)).toContain(16060);
    expect(overlapReservation.map((p) => p.id)).not.toContain(16061);

    // Blocked date on property 16061 is T+55..T+60; ND-SEED1 on 16060 is pending T+40..T+70
    const overlapBoth = await listProperties({
      city: 'Madrid',
      moveIn: getOffsetDateStr(56),
      moveOut: getOffsetDateStr(59),
    });
    expect(overlapBoth.map((p) => p.id)).not.toContain(16061);
    expect(overlapBoth.map((p) => p.id)).not.toContain(16060);

    // Far future free window (T+200..T+230) -> both Madrid properties available
    const freeWindow = await listProperties({
      city: 'Madrid',
      moveIn: getOffsetDateStr(200),
      moveOut: getOffsetDateStr(230),
    });
    expect(freeWindow.map((p) => p.id)).toEqual(expect.arrayContaining([16060, 16061]));
  });

  it('retrieves property by URL slug and ID, enforcing published + approved host by default (AC-LIST-6)', async () => {
    const prop = await getPropertyBySlug('exclusive-240-sqm-residence-in-jeronimos-retiro-park');
    expect(prop).not.toBeNull();
    expect(prop?.id).toBe(16060);
    expect(prop?.city).toBe('Madrid');

    const byId = await getPropertyById(16060);
    expect(byId).not.toBeNull();
    expect(byId?.title).toBe(prop?.title);

    expect(await getPropertyBySlug('non-existent-property-slug')).toBeNull();
    expect(await getPropertyById(999999)).toBeNull();

    // Temporarily suspend Host 1 and verify AC-LIST-6 hides Host 1 listings publicly
    await db
      .update(hostProfiles)
      .set({ status: 'suspended' })
      .where(eq(hostProfiles.id, 1));
    try {
      const publicList = await listProperties();
      expect(publicList.some((p) => p.hostId === 1)).toBe(false);
      expect(
        await getPropertyBySlug('exclusive-240-sqm-residence-in-jeronimos-retiro-park')
      ).toBeNull();
      expect(
        await getPropertyBySlug('exclusive-240-sqm-residence-in-jeronimos-retiro-park', {
          allowUnpublished: true,
        })
      ).not.toBeNull();
    } finally {
      await db
        .update(hostProfiles)
        .set({ status: 'approved' })
        .where(eq(hostProfiles.id, 1));
    }
  });

  it('separates listings by hostId (Host 1 has 4, Host 2 has 4)', async () => {
    const host1Listings = await listHostListings(1);
    expect(host1Listings).toHaveLength(4);
    host1Listings.forEach((p) => expect(p.hostId).toBe(1));

    const host2Listings = await listHostListings(2);
    expect(host2Listings).toHaveLength(4);
    host2Listings.forEach((p) => expect(p.hostId).toBe(2));
  });

  it('allows host to create, update, and delete a listing while preventing IDOR', async () => {
    let createdId: number | null = null;
    try {
      const created = await saveHostListing(1, {
        title: 'New Luxury Penthouse in Salamanca',
        city: 'Madrid',
        pricePerMonth: 350000,
      });
      createdId = created.id;

      expect(created.id).toBeGreaterThan(19002);
      expect(created.hostId).toBe(1);
      expect(created.locationId).toBe(2241);
      expect(created.status).toBe('draft');

      const host1Listings = await listHostListings(1);
      expect(host1Listings).toHaveLength(5);

      const updated = await saveHostListing(1, {
        id: created.id,
        title: 'Updated Salamanca Penthouse',
      });
      expect(updated.title).toBe('Updated Salamanca Penthouse');

      // IDOR check: Host 2 cannot edit Host 1's listing
      await expect(
        saveHostListing(2, {
          id: created.id,
          title: 'Hacked Title',
        })
      ).rejects.toThrow('Unauthorized');

      // Admin update & status lifecycle
      const statusUpdated = await updatePropertyStatus(
        created.id,
        'rejected',
        'Missing high-res photos'
      );
      expect(statusUpdated?.status).toBe('rejected');
      expect(statusUpdated?.rejectionReason).toBe('Missing high-res photos');

      const adminUpdated = await updateProperty(created.id, { bedrooms: 4 });
      expect(adminUpdated?.bedrooms).toBe(4);
    } finally {
      if (createdId != null) {
        const deleted = await deleteProperty(createdId);
        expect(deleted).toBe(true);
      }
    }
  });

  it('reorders featured properties atomically', async () => {
    const before = await listProperties({ featured: true });
    const originalOrder = before.map((p) => p.id);

    try {
      const reordered = await reorderFeaturedProperties([16061, 16060, 17001]);
      expect(reordered.map((p) => p.id)).toEqual([16061, 16060, 17001]);
      expect(reordered[0].featuredPosition).toBe(1);
      expect(reordered[1].featuredPosition).toBe(2);
      expect(reordered[2].featuredPosition).toBe(3);
    } finally {
      await reorderFeaturedProperties(originalOrder);
      // Ensure clean timestamps/state verified
      const restored = await db
        .select({ id: properties.id, pos: properties.featuredPosition })
        .from(properties)
        .where(eq(properties.id, originalOrder[0]));
      expect(restored[0]?.pos).toBe(1);
    }
  });

  it('manages user favorites in PostgreSQL (add, check, toggle, list, remove, set)', async () => {
    const testUserId = 1;
    const originalFavs = await listUserFavoriteIds(testUserId);

    try {
      await db.delete(favorites).where(eq(favorites.userId, testUserId));

      expect(await listUserFavoriteIds(testUserId)).toEqual([]);
      expect(await isPropertyFavorite(16060, testUserId)).toBe(false);

      const afterAdd = await addFavorite(16060, testUserId);
      expect(afterAdd).toEqual([16060]);
      expect(await isPropertyFavorite(16060, testUserId)).toBe(true);

      // Idempotent add
      expect(await addFavorite(16060, testUserId)).toEqual([16060]);

      const toggledOn = await toggleFavorite(16061, testUserId);
      expect(toggledOn.isFavorite).toBe(true);
      expect(toggledOn.favoriteIds).toEqual([16060, 16061]);

      const favProps = await listUserFavoriteProperties(testUserId);
      expect(favProps.map((p) => p.id)).toEqual([16060, 16061]);

      const toggledOff = await toggleFavorite(16060, testUserId);
      expect(toggledOff.isFavorite).toBe(false);
      expect(toggledOff.favoriteIds).toEqual([16061]);

      const afterRemove = await removeFavorite(16061, testUserId);
      expect(afterRemove).toEqual([]);

      const afterSet = await setUserFavorites(testUserId, [17001, 17002, 17001]);
      expect(afterSet).toEqual([17001, 17002]);
    } finally {
      await setUserFavorites(testUserId, originalFavs);
    }
  });
});
