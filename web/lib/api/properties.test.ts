import { describe, it, expect, beforeEach } from 'vitest';
import {
  listProperties,
  getPropertyBySlug,
  getPropertyById,
  listHostListings,
  saveHostListing,
  updatePropertyStatus,
} from './properties';
import { resetMockData } from './mock/seed-data';

describe('Properties Mock API Layer', () => {
  beforeEach(() => {
    resetMockData();
  });

  it('returns all 8 published seed properties by default', async () => {
    const properties = await listProperties();
    expect(properties).toHaveLength(8);
    properties.forEach((p) => {
      expect(p.status).toBe('published');
      expect(p.pricePerMonth).toBeGreaterThan(0);
      expect(p.images.length).toBeGreaterThan(0);
    });
  });

  it('filters properties by city name case-insensitively', async () => {
    const madridProps = await listProperties({ city: 'madrid' });
    expect(madridProps).toHaveLength(2);
    madridProps.forEach((p) => expect(p.city.toLowerCase()).toBe('madrid'));

    const limaProps = await listProperties({ city: 'LIMA' });
    expect(limaProps).toHaveLength(2);
    limaProps.forEach((p) => expect(p.city.toLowerCase()).toBe('lima'));
  });

  it('filters properties by minimum bedrooms', async () => {
    const multiBedroom = await listProperties({ bedrooms: 2 });
    expect(multiBedroom.length).toBeGreaterThan(0);
    multiBedroom.forEach((p) => expect(p.bedrooms).toBeGreaterThanOrEqual(2));
  });

  it('filters properties by price range', async () => {
    // $1,500 to $2,500 (150,000 to 250,000 cents)
    const midRange = await listProperties({ minPrice: 150000, maxPrice: 250000 });
    midRange.forEach((p) => {
      expect(p.pricePerMonth).toBeGreaterThanOrEqual(150000);
      expect(p.pricePerMonth).toBeLessThanOrEqual(250000);
    });
  });

  it('filters properties by booking mode (Direct vs Request)', async () => {
    // Requirements: 1 request-to-book (16060), 7 instant book
    const instantProps = await listProperties({ isDirectBooking: true });
    expect(instantProps).toHaveLength(7);

    const requestProps = await listProperties({ isDirectBooking: false });
    expect(requestProps).toHaveLength(1);
    expect(requestProps[0].id).toBe(16060);
  });

  it('filters properties by verified minimum Wi-Fi speed', async () => {
    const fastWifi = await listProperties({ minWifiSpeed: 500 });
    fastWifi.forEach((p) => {
      expect(p.workstation.wifiSpeed).toBeGreaterThanOrEqual(500);
    });
  });

  it('retrieves property by URL slug and ID', async () => {
    const prop = await getPropertyBySlug('exclusive-240-sqm-residence-in-jeronimos-retiro-park');
    expect(prop).not.toBeNull();
    expect(prop?.id).toBe(16060);
    expect(prop?.city).toBe('Madrid');

    const byId = await getPropertyById(16060);
    expect(byId).not.toBeNull();
    expect(byId?.title).toBe(prop?.title);

    const nonExistent = await getPropertyBySlug('non-existent-property-slug');
    expect(nonExistent).toBeNull();
  });

  it('separates listings by hostId (Host 1 has 4, Host 2 has 4)', async () => {
    const host1Listings = await listHostListings(1);
    expect(host1Listings).toHaveLength(4);
    host1Listings.forEach((p) => expect(p.hostId).toBe(1));

    const host2Listings = await listHostListings(2);
    expect(host2Listings).toHaveLength(4);
    host2Listings.forEach((p) => expect(p.hostId).toBe(2));
  });

  it('allows host to create a new listing draft', async () => {
    const created = await saveHostListing(1, {
      title: 'New Luxury Penthouse in Salamanca',
      city: 'Madrid',
      pricePerMonth: 350000,
    });

    expect(created.id).toBeGreaterThan(19002);
    expect(created.hostId).toBe(1);
    expect(created.status).toBe('draft');

    const host1Listings = await listHostListings(1);
    expect(host1Listings).toHaveLength(5);
  });

  it('allows updating an existing host listing', async () => {
    const updated = await saveHostListing(1, {
      id: 16060,
      title: 'Updated Madrid Sky Home Title',
    });

    expect(updated.title).toBe('Updated Madrid Sky Home Title');
    const fetched = await getPropertyById(16060);
    expect(fetched?.title).toBe('Updated Madrid Sky Home Title');
  });

  it('prevents a host from editing a listing of another host', async () => {
    await expect(
      saveHostListing(2, {
        id: 16060, // Belongs to Host 1
        title: 'Hacked Title',
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('updates property status with rejection reason', async () => {
    const updated = await updatePropertyStatus(16060, 'rejected', 'Missing high-res photos');
    expect(updated?.status).toBe('rejected');
    expect(updated?.rejectionReason).toBe('Missing high-res photos');
  });
});
