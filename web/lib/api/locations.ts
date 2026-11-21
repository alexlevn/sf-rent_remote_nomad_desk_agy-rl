import { eq, and, or, sql, asc, gte, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { locations, categories, properties } from '@/lib/db/schema';
import type { Location, Category } from '@/lib/types';
import {
  locationInputSchema,
  updateLocationSchema,
  locationReorderSchema,
} from '@/lib/validations/location';

export interface ListLocationsOptions {
  continent?: string;
  country?: string;
  includeInactive?: boolean;
  isActive?: boolean;
  sortBy?: 'position' | 'name';
}

function mapLocationRow(row: typeof locations.$inferSelect): Location {
  return {
    id: row.id,
    city: row.city,
    name: row.name,
    slug: row.slug || row.city.toLowerCase(),
    country: row.country,
    countryCode: row.countryCode,
    continent: row.continent || '',
    propertiesCount: row.propertiesCount,
    description: row.description || '',
    image: row.image || '/seed/location/placeholder.jpg',
    center: (row.center as [number, number]) || [0, 0],
    isActive: row.isActive,
    position: row.position,
  };
}

function mapCategoryRow(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || '',
    icon: row.icon || '',
    description: row.description || '',
  };
}

/**
 * Lists destination locations from PostgreSQL DB.
 * By default returns only active locations sorted by position.
 */
export async function listLocations(options?: ListLocationsOptions): Promise<Location[]> {
  const conditions = [];

  if (options?.isActive !== undefined) {
    conditions.push(eq(locations.isActive, options.isActive));
  } else if (!options?.includeInactive) {
    conditions.push(eq(locations.isActive, true));
  }

  if (options?.continent && options.continent.toLowerCase() !== 'all') {
    conditions.push(eq(sql`lower(${locations.continent})`, options.continent.trim().toLowerCase()));
  }

  if (options?.country) {
    conditions.push(eq(sql`lower(${locations.country})`, options.country.trim().toLowerCase()));
  }

  const query = db.select().from(locations);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderClause =
    options?.sortBy === 'name'
      ? [asc(locations.name), asc(locations.id)]
      : [asc(locations.position), asc(locations.id)];

  const rows = whereClause
    ? await query.where(whereClause).orderBy(...orderClause)
    : await query.orderBy(...orderClause);

  return rows.map(mapLocationRow);
}

/**
 * Retrieves a destination location by slug or city key (e.g. 'madrid', 'barcelona').
 * Automatically strips 'furnished-apartments-' prefix if present.
 */
export async function getLocationBySlug(slug?: string): Promise<Location | null> {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.replace(/^furnished-apartments-/i, '').trim().toLowerCase();
  if (!cleanSlug) return null;

  const rows = await db
    .select()
    .from(locations)
    .where(
      or(
        eq(sql`lower(${locations.slug})`, cleanSlug),
        eq(sql`lower(${locations.city})`, cleanSlug)
      )
    )
    .limit(1);

  return rows.length > 0 ? mapLocationRow(rows[0]) : null;
}

/**
 * Retrieves a location by its ID.
 */
export async function getLocationById(id: number): Promise<Location | null> {
  if (!id || typeof id !== 'number') return null;
  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);

  return rows.length > 0 ? mapLocationRow(rows[0]) : null;
}

/**
 * Saves location updates or creates a new location (admin CMS).
 * Validates payload with Zod and manages position collision shifts.
 */
export async function saveLocation(data: Partial<Location>): Promise<Location> {
  return await db.transaction(async (tx) => {
    // 1. Check if updating existing record
    let existingRow: typeof locations.$inferSelect | null = null;
    if (data.id) {
      const res = await tx.select().from(locations).where(eq(locations.id, data.id)).limit(1);
      if (res.length > 0) existingRow = res[0];
    } else {
      const cleanSlug = data.slug
        ? data.slug.toLowerCase().replace(/^furnished-apartments-/, '').trim()
        : undefined;
      const cleanName = data.name ? data.name.trim().toLowerCase() : undefined;
      const conditions = [];
      if (cleanSlug) conditions.push(eq(sql`lower(${locations.slug})`, cleanSlug));
      if (cleanName) conditions.push(eq(sql`lower(${locations.name})`, cleanName));
      if (conditions.length > 0) {
        const res = await tx.select().from(locations).where(or(...conditions)).limit(1);
        if (res.length > 0) existingRow = res[0];
      }
    }

    if (existingRow) {
      const validated = updateLocationSchema.parse(data);
      const targetId = existingRow.id;

      if (validated.position != null && validated.position <= 8) {
        await tx
          .update(locations)
          .set({ position: sql`${locations.position} + 1` })
          .where(and(ne(locations.id, targetId), gte(locations.position, validated.position)));
      }

      const updateValues: Record<string, unknown> = {};
      if (validated.name !== undefined) updateValues.name = validated.name;
      if (validated.city !== undefined) updateValues.city = validated.city;
      if (validated.slug !== undefined) {
        updateValues.slug = validated.slug.toLowerCase().replace(/^furnished-apartments-/, '').trim();
      }
      if (validated.country !== undefined) updateValues.country = validated.country;
      if (validated.countryCode !== undefined) updateValues.countryCode = validated.countryCode;
      if (validated.continent !== undefined) updateValues.continent = validated.continent;
      if (validated.propertiesCount !== undefined) updateValues.propertiesCount = validated.propertiesCount;
      if (validated.description !== undefined) updateValues.description = validated.description;
      if (validated.image !== undefined) updateValues.image = validated.image;
      if (validated.center !== undefined) updateValues.center = validated.center;
      if (validated.isActive !== undefined) updateValues.isActive = validated.isActive;
      if (validated.position !== undefined) updateValues.position = validated.position;

      const updated = await tx
        .update(locations)
        .set(updateValues)
        .where(eq(locations.id, targetId))
        .returning();

      return mapLocationRow(updated[0]);
    }

    // 2. Insert new record
    const validated = locationInputSchema.parse(data);

    if (validated.position != null && validated.position <= 8) {
      await tx
        .update(locations)
        .set({ position: sql`${locations.position} + 1` })
        .where(gte(locations.position, validated.position));
    }

    const maxIdResult = await tx
      .select({ maxId: sql<number>`coalesce(max(${locations.id}), 0)::int` })
      .from(locations);
    const newId = (maxIdResult[0]?.maxId ?? 0) + 1;

    const city = validated.city || validated.name.toLowerCase().replace(/\s+/g, '-');
    const slug = (validated.slug || validated.name)
      .toLowerCase()
      .replace(/^furnished-apartments-/, '')
      .replace(/\s+/g, '-');
    const position = validated.position ?? newId;

    const inserted = await tx
      .insert(locations)
      .values({
        id: newId,
        city,
        name: validated.name,
        slug,
        country: validated.country,
        countryCode: validated.countryCode,
        continent: validated.continent || 'Europe',
        propertiesCount: validated.propertiesCount ?? 0,
        description: validated.description || '',
        image: validated.image || '/seed/location/placeholder.jpg',
        center: validated.center || [40.4168, -3.7038],
        isActive: validated.isActive ?? true,
        position,
      })
      .returning();

    return mapLocationRow(inserted[0]);
  });
}

/**
 * Deletes a location if it has no associated properties in DB.
 */
export async function deleteLocation(id: number): Promise<boolean> {
  const existing = await getLocationById(id);
  if (!existing) return false;

  const propertyRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(properties)
    .where(
      or(
        eq(properties.locationId, id),
        eq(sql`lower(${properties.city})`, existing.city.toLowerCase())
      )
    );

  const linkedCount = propertyRows[0]?.count ?? 0;
  if (linkedCount > 0 || (existing.propertiesCount && existing.propertiesCount > 0)) {
    throw new Error('Cannot delete destination with existing properties. Please hide it instead.');
  }

  await db.delete(locations).where(eq(locations.id, id));
  return true;
}

/**
 * Reorders top cities positions in a transaction.
 */
export async function reorderTopCities(orderedIds: number[]): Promise<Location[]> {
  const validatedIds = locationReorderSchema.parse(orderedIds);
  await db.transaction(async (tx) => {
    for (let idx = 0; idx < validatedIds.length; idx++) {
      const id = validatedIds[idx];
      await tx
        .update(locations)
        .set({ position: idx + 1 })
        .where(eq(locations.id, id));
    }
  });

  return listLocations({ includeInactive: true });
}

/**
 * Lists categories from PostgreSQL DB.
 */
export async function listCategories(): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.id));
  return rows.map(mapCategoryRow);
}

/**
 * Retrieves a category by slug from PostgreSQL DB.
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(sql`lower(${categories.slug})`, normalized))
    .limit(1);

  return rows.length > 0 ? mapCategoryRow(rows[0]) : null;
}
