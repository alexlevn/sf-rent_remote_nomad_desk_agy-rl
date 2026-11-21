'use server';

import { removeFavorite, toggleFavorite } from '@/lib/api/favorites';
import { revalidatePath } from 'next/cache';

export async function removeFavoriteAction(propertyId: number, userId: number = 1) {
  try {
    const updatedIds = await removeFavorite(propertyId, userId);
    revalidatePath('/guests/favorites');
    revalidatePath('/guests/dashboard');
    return { success: true, favoriteIds: updatedIds };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove favorite',
      favoriteIds: [],
    };
  }
}

export async function toggleFavoriteAction(propertyId: number, userId: number = 1) {
  try {
    const result = await toggleFavorite(propertyId, userId);
    revalidatePath('/guests/favorites');
    revalidatePath('/guests/dashboard');
    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to toggle favorite',
      isFavorite: false,
      favoriteIds: [],
    };
  }
}
