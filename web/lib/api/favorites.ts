import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { favorites, properties } from '@/lib/db/schema';
import { getPgErrorCode } from '@/lib/db/query-helpers';
import type { Property } from '@/lib/types';
import { int4IdSchema } from '@/lib/validations/property';
import { mapPropertyRow } from './properties';

/**
 * Lists favorite property IDs for a specific user from PostgreSQL.
 */
export async function listUserFavoriteIds(userId: number = 1): Promise<number[]> {
  const parsedUser = int4IdSchema.safeParse(userId);
  if (!parsedUser.success) return [];

  const rows = await db
    .select({ propertyId: favorites.propertyId })
    .from(favorites)
    .where(eq(favorites.userId, parsedUser.data))
    .orderBy(asc(favorites.createdAt), asc(favorites.id));

  return rows.map((r) => r.propertyId);
}

/**
 * Sets favorite property IDs for a user (replaces existing list atomically).
 */
export async function setUserFavorites(
  userId: number = 1,
  propertyIds: number[]
): Promise<number[]> {
  const validUserId = int4IdSchema.parse(userId);
  const uniqueIds = Array.from(
    new Set(propertyIds.filter((id) => int4IdSchema.safeParse(id).success))
  );

  await db.transaction(async (tx) => {
    await tx.delete(favorites).where(eq(favorites.userId, validUserId));

    if (uniqueIds.length > 0) {
      // Only insert IDs that exist in properties to satisfy FK constraint
      const existingProps = await tx
        .select({ id: properties.id })
        .from(properties)
        .where(inArray(properties.id, uniqueIds));
      const existingSet = new Set(existingProps.map((p) => p.id));
      const validToInsert = uniqueIds.filter((id) => existingSet.has(id));

      if (validToInsert.length > 0) {
        await tx
          .insert(favorites)
          .values(validToInsert.map((propertyId) => ({ userId: validUserId, propertyId })))
          .onConflictDoNothing();
      }
    }
  });

  return listUserFavoriteIds(validUserId);
}

/**
 * Adds a property to a user's favorites.
 */
export async function addFavorite(propertyId: number, userId: number = 1): Promise<number[]> {
  const validUserId = int4IdSchema.parse(userId);
  const validPropId = int4IdSchema.parse(propertyId);

  try {
    await db
      .insert(favorites)
      .values({ userId: validUserId, propertyId: validPropId })
      .onConflictDoNothing();
  } catch (err) {
    if (getPgErrorCode(err) === '23503') {
      throw new Error('Property not found.');
    }
    throw err;
  }

  return listUserFavoriteIds(validUserId);
}

/**
 * Removes a property from a user's favorites.
 */
export async function removeFavorite(
  propertyId: number,
  userId: number = 1
): Promise<number[]> {
  const validUserId = int4IdSchema.parse(userId);
  const validPropId = int4IdSchema.parse(propertyId);

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, validUserId), eq(favorites.propertyId, validPropId)));

  return listUserFavoriteIds(validUserId);
}

/**
 * Toggles a property in a user's favorites.
 */
export async function toggleFavorite(
  propertyId: number,
  userId: number = 1
): Promise<{ isFavorite: boolean; favoriteIds: number[] }> {
  const validUserId = int4IdSchema.parse(userId);
  const validPropId = int4IdSchema.parse(propertyId);

  let isFavorite: boolean;
  try {
    isFavorite = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(favorites)
        .where(and(eq(favorites.userId, validUserId), eq(favorites.propertyId, validPropId)))
        .returning({ id: favorites.id });

      if (deleted.length > 0) {
        return false;
      }

      await tx
        .insert(favorites)
        .values({ userId: validUserId, propertyId: validPropId })
        .onConflictDoNothing();
      return true;
    });
  } catch (err) {
    if (getPgErrorCode(err) === '23503') {
      throw new Error('Property not found.');
    }
    throw err;
  }

  const favoriteIds = await listUserFavoriteIds(validUserId);
  return { isFavorite, favoriteIds };
}

/**
 * Checks if a property is in a user's favorites.
 */
export async function isPropertyFavorite(
  propertyId: number,
  userId: number = 1
): Promise<boolean> {
  const parsedUser = int4IdSchema.safeParse(userId);
  const parsedProp = int4IdSchema.safeParse(propertyId);
  if (!parsedUser.success || !parsedProp.success) return false;

  const rows = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(
      and(eq(favorites.userId, parsedUser.data), eq(favorites.propertyId, parsedProp.data))
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Lists complete Property objects for a user's favorites via a single join query.
 */
export async function listUserFavoriteProperties(userId: number = 1): Promise<Property[]> {
  const parsedUser = int4IdSchema.safeParse(userId);
  if (!parsedUser.success) return [];

  const rows = await db
    .select({ property: properties })
    .from(favorites)
    .innerJoin(properties, eq(favorites.propertyId, properties.id))
    .where(eq(favorites.userId, parsedUser.data))
    .orderBy(asc(favorites.createdAt), asc(favorites.id));

  return rows.map((r) => mapPropertyRow(r.property));
}
