import type { Location } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists destination locations. By default returns only active locations.
 */
export async function listLocations(options?: {
  includeInactive?: boolean;
}): Promise<Location[]> {
  const store = getMockStore();
  const list = options?.includeInactive
    ? store.locations
    : store.locations.filter((loc) => loc.isActive !== false);
  return [...list]
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((loc) => ({ ...loc }));
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
  const existingIdx = data.id
    ? store.locations.findIndex((l) => l.id === data.id)
    : store.locations.findIndex(
        (l) =>
          (data.slug && l.slug.toLowerCase() === data.slug.toLowerCase()) ||
          (data.name && l.name.toLowerCase() === data.name.toLowerCase())
      );

  if (existingIdx !== -1) {
    if (data.position != null && data.position <= 8) {
      store.locations.forEach((l) => {
        if (
          l.id !== store.locations[existingIdx].id &&
          l.position != null &&
          l.position >= data.position!
        ) {
          l.position += 1;
        }
      });
    }
    store.locations[existingIdx] = { ...store.locations[existingIdx], ...data };
    return { ...store.locations[existingIdx] };
  }

  if (data.position != null && data.position <= 8) {
    store.locations.forEach((l) => {
      if (l.position != null && l.position >= data.position!) {
        l.position += 1;
      }
    });
  }

  const maxId = store.locations.reduce((max, l) => Math.max(max, l.id), 0);
  const newLocation: Location = {
    id: maxId + 1,
    city: data.city || data.name?.toLowerCase().replace(/\s+/g, '-') || 'new-city',
    name: data.name || data.city || 'New City',
    slug: (data.slug || data.name || data.city || 'new-city')
      .toLowerCase()
      .replace(/^furnished-apartments-/, '')
      .replace(/\s+/g, '-'),
    country: data.country || 'Global',
    countryCode: data.countryCode || 'GL',
    continent: data.continent || 'Europe',
    propertiesCount: data.propertiesCount || 0,
    description: data.description || '',
    image: data.image || '/seed/location/placeholder.jpg',
    center: data.center || [40.4168, -3.7038],
    isActive: data.isActive ?? true,
    position: data.position ?? maxId + 1,
  };
  store.locations.push(newLocation);
  return { ...newLocation };
}

/**
 * Deletes a location if it has no associated properties.
 */
export async function deleteLocation(id: number): Promise<boolean> {
  const store = getMockStore();
  const idx = store.locations.findIndex((l) => l.id === id);
  if (idx === -1) return false;

  if (store.locations[idx].propertiesCount > 0) {
    throw new Error('Cannot delete destination with existing properties. Please hide it instead.');
  }

  store.locations.splice(idx, 1);
  return true;
}

/**
 * Reorders top cities positions.
 */
export async function reorderTopCities(orderedIds: number[]): Promise<Location[]> {
  const store = getMockStore();
  orderedIds.forEach((id, idx) => {
    const loc = store.locations.find((l) => l.id === id);
    if (loc) {
      loc.position = idx + 1;
    }
  });
  return store.locations.map((loc) => ({ ...loc }));
}
