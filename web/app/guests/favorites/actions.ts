'use server';

import { revalidatePath } from 'next/cache';
import { removeFavorite, toggleFavorite, listUserFavoriteIds } from '@/lib/api/favorites';
import { requireStrictUser } from '@/lib/auth/guards';

export async function removeFavoriteAction(propertyId: number) {
  try {
    const user = await requireStrictUser();
    const updatedIds = await removeFavorite(propertyId, user.id);
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

export async function toggleFavoriteAction(propertyId: number) {
  try {
    const user = await requireStrictUser();
    const result = await toggleFavorite(propertyId, user.id);
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

export async function getUserFavoriteIdsAction() {
  try {
    const user = await requireStrictUser();
    const favoriteIds = await listUserFavoriteIds(user.id);
    return { success: true, authenticated: true, favoriteIds };
  } catch {
    return { success: false, authenticated: false, favoriteIds: [] as number[] };
  }
}
