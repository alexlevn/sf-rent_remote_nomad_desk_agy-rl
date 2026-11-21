import type { Location } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists all destination locations.
 */
export async function listLocations(): Promise<Location[]> {
  const store = getMockStore();
  return store.locations.map((loc) => ({ ...loc }));
}

/**
 * Retrieves a destination location by slug (e.g. 'madrid', 'barcelona').
 */
export async function getLocationBySlug(slug?: string): Promise<Location | null> {
  if (!slug || typeof slug !== 'string') return null;
  const store = getMockStore();
  // Strip 'furnished-apartments-' prefix if present
  const cleanSlug = slug.replace(/^furnished-apartments-/, '').trim().toLowerCase();
  const loc = store.locations.find(
    (l) => l.slug.toLowerCase() === cleanSlug || l.city.toLowerCase() === cleanSlug
  );
  return loc ? { ...loc } : null;
}

/**
 * Retrieves a location by its ID.
 */
export async function getLocationById(id: number): Promise<Location | null> {
  const store = getMockStore();
  const loc = store.locations.find((l) => l.id === id);
  return loc ? { ...loc } : null;
}

/**
 * Saves location updates or creates a new location (admin CMS).
 */
export async function saveLocation(data: Partial<Location>): Promise<Location> {
  const store = getMockStore();
  if (data.id) {
    const idx = store.locations.findIndex((l) => l.id === data.id);
    if (idx !== -1) {
      store.locations[idx] = { ...store.locations[idx], ...data };
      return { ...store.locations[idx] };
    }
  }

  const maxId = store.locations.reduce((max, l) => Math.max(max, l.id), 0);
  const newLocation: Location = {
    id: maxId + 1,
    city: data.city || 'new-city',
    name: data.name || 'New City',
    slug: data.slug || 'new-city',
    country: data.country || 'Global',
    countryCode: data.countryCode || 'GL',
    continent: data.continent || 'Europe',
    propertiesCount: data.propertiesCount || 0,
    description: data.description || '',
    image: data.image || '/seed/location/madrid.jpg',
    center: data.center || [40.4168, -3.7038],
    isActive: data.isActive ?? true,
    position: data.position ?? maxId + 1,
  };
  store.locations.push(newLocation);
  return { ...newLocation };
}
