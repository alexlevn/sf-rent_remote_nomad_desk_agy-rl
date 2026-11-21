import type { Property } from '@/lib/types';
import { getPropertyById } from './properties';

// Global persistence across Next.js reloads
const globalForFavorites = globalThis as unknown as {
  __nomaddeskFavorites?: Record<number, number[]>;
};

function getFavoritesStore(): Record<number, number[]> {
  if (!globalForFavorites.__nomaddeskFavorites) {
    globalForFavorites.__nomaddeskFavorites = {
      // Default initial favorites for Demo User (userId 1)
      1: [16060, 16061, 17001, 17002],
    };
  }
  return globalForFavorites.__nomaddeskFavorites;
}

/**
 * Lists favorite property IDs for a specific user.
 */
export async function listUserFavoriteIds(userId: number = 1): Promise<number[]> {
  const store = getFavoritesStore();
  return [...(store[userId] || [])];
}

/**
 * Sets favorite property IDs for a user.
 */
export async function setUserFavorites(userId: number = 1, propertyIds: number[]): Promise<number[]> {
  const store = getFavoritesStore();
  store[userId] = [...propertyIds];
  return [...store[userId]];
}

/**
 * Adds a property to a user's favorites.
 */
export async function addFavorite(propertyId: number, userId: number = 1): Promise<number[]> {
  const store = getFavoritesStore();
  const current = store[userId] || [];
  if (!current.includes(propertyId)) {
    store[userId] = [...current, propertyId];
  }
  return [...store[userId]];
}

/**
 * Removes a property from a user's favorites.
 */
export async function removeFavorite(propertyId: number, userId: number = 1): Promise<number[]> {
  const store = getFavoritesStore();
  const current = store[userId] || [];
  store[userId] = current.filter((id) => id !== propertyId);
  return [...store[userId]];
}

/**
 * Toggles a property in a user's favorites.
 */
export async function toggleFavorite(
  propertyId: number,
  userId: number = 1
): Promise<{ isFavorite: boolean; favoriteIds: number[] }> {
  const store = getFavoritesStore();
  const current = store[userId] || [];
  const exists = current.includes(propertyId);
  if (exists) {
    store[userId] = current.filter((id) => id !== propertyId);
    return { isFavorite: false, favoriteIds: [...store[userId]] };
  } else {
    store[userId] = [...current, propertyId];
    return { isFavorite: true, favoriteIds: [...store[userId]] };
  }
}

/**
 * Checks if a property is in a user's favorites.
 */
export async function isPropertyFavorite(propertyId: number, userId: number = 1): Promise<boolean> {
  const store = getFavoritesStore();
  const current = store[userId] || [];
  return current.includes(propertyId);
}

/**
 * Lists complete Property objects for a user's favorites.
 */
export async function listUserFavoriteProperties(userId: number = 1): Promise<Property[]> {
  const ids = await listUserFavoriteIds(userId);
  const properties: Property[] = [];
  for (const id of ids) {
    const prop = await getPropertyById(id);
    if (prop) {
      properties.push(prop);
    }
  }
  return properties;
}
