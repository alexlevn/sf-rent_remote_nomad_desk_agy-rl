import { eq, and, or, sql, asc, gte, ne, ilike, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  escapeIlike,
  getPgErrorCode,
  normalizePagination,
  sanitizeSearchInput,
} from '@/lib/db/query-helpers';
import { locations, categories, properties } from '@/lib/db/schema';
import type { Location, Category } from '@/lib/types';
import {
  DEFAULT_LOCATION_IMAGE,
  locationIdSchema,
  locationInputSchema,
  updateLocationSchema,
  locationReorderSchema,
} from '@/lib/validations/location';
import { sanitizeHtml } from '@/lib/validations/content';

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
    image: row.image || DEFAULT_LOCATION_IMAGE,
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

  if (typeof options?.continent === 'string') {
    const cleanContinent = sanitizeSearchInput(options.continent, 50);
    if (cleanContinent && cleanContinent.toLowerCase() !== 'all') {
      conditions.push(eq(sql`lower(${locations.continent})`, cleanContinent.toLowerCase()));
    }
  }

  if (typeof options?.country === 'string') {
    const cleanCountry = sanitizeSearchInput(options.country, 100);
    if (cleanCountry) {
      conditions.push(eq(sql`lower(${locations.country})`, cleanCountry.toLowerCase()));
    }
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
  const cleanSlug = sanitizeSearchInput(slug, 150)
    .replace(/^furnished-apartments-/i, '')
    .trim()
    .toLowerCase();
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
  const parsedId = locationIdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.id, parsedId.data))
    .limit(1);

  return rows.length > 0 ? mapLocationRow(rows[0]) : null;
}

/**
 * Saves location updates or creates a new location (admin CMS).
 * Validates payload with Zod, serializes non-serial PK allocation with an advisory lock,
 * and manages top-city position shifts.
 */
export async function saveLocation(data: Partial<Location>): Promise<Location> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Check if updating existing record
      let existingRow: typeof locations.$inferSelect | null = null;
      if (data.id !== undefined) {
        const validId = locationIdSchema.parse(data.id);
        const res = await tx.select().from(locations).where(eq(locations.id, validId)).limit(1);
        if (res.length > 0) existingRow = res[0];
      } else {
        const cleanSlug =
          typeof data.slug === 'string'
            ? sanitizeSearchInput(data.slug, 150)
                .toLowerCase()
                .replace(/^furnished-apartments-/, '')
                .trim()
            : undefined;
        const cleanName =
          typeof data.name === 'string'
            ? sanitizeSearchInput(data.name, 150).toLowerCase()
            : undefined;
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

        const updateValues: Partial<typeof locations.$inferInsert> = {};
        if (validated.name !== undefined) updateValues.name = validated.name;
        if (validated.city !== undefined) updateValues.city = validated.city;
        if (validated.slug !== undefined) {
          updateValues.slug = validated.slug
            .toLowerCase()
            .replace(/^furnished-apartments-/, '')
            .trim();
        }
        if (validated.country !== undefined) updateValues.country = validated.country;
        if (validated.countryCode !== undefined) updateValues.countryCode = validated.countryCode;
        if (validated.continent !== undefined) updateValues.continent = validated.continent;
        if (validated.propertiesCount !== undefined) {
          updateValues.propertiesCount = validated.propertiesCount;
        }
        if (validated.description !== undefined) {
          updateValues.description = sanitizeHtml(validated.description);
        }
        if (validated.image !== undefined) updateValues.image = validated.image;
        if (validated.center !== undefined) updateValues.center = validated.center;
        if (validated.isActive !== undefined) updateValues.isActive = validated.isActive;
        if (validated.position !== undefined) updateValues.position = validated.position;

        if (Object.keys(updateValues).length === 0) {
          return mapLocationRow(existingRow);
        }

        const updated = await tx
          .update(locations)
          .set(updateValues)
          .where(eq(locations.id, targetId))
          .returning();

        return mapLocationRow(updated[0]);
      }

      // 2. Insert new record with advisory lock for non-serial integer PK allocation
      const validated = locationInputSchema.parse(data);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(728392)`);

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
          description: sanitizeHtml(validated.description || ''),
          image: validated.image || DEFAULT_LOCATION_IMAGE,
          center: validated.center || [40.4168, -3.7038],
          isActive: validated.isActive ?? true,
          position,
        })
        .returning();

      return mapLocationRow(inserted[0]);
    });
  } catch (err) {
    if (getPgErrorCode(err) === '23505') {
      throw new Error('A destination with this URL slug already exists.');
    }
    throw err;
  }
}

/**
 * Deletes a location if it has no associated properties in DB.
 */
export async function deleteLocation(id: number): Promise<boolean> {
  const parsedId = locationIdSchema.safeParse(id);
  if (!parsedId.success) return false;

  const existing = await getLocationById(parsedId.data);
  if (!existing) return false;

  const propertyRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(properties)
    .where(
      or(
        eq(properties.locationId, parsedId.data),
        eq(sql`lower(${properties.city})`, existing.city.toLowerCase())
      )
    );

  const linkedCount = propertyRows[0]?.count ?? 0;
  if (linkedCount > 0 || (existing.propertiesCount && existing.propertiesCount > 0)) {
    throw new Error('Cannot delete destination with existing properties. Please hide it instead.');
  }

  try {
    const deleted = await db
      .delete(locations)
      .where(eq(locations.id, parsedId.data))
      .returning({ id: locations.id });
    return deleted.length > 0;
  } catch (err) {
    if (getPgErrorCode(err) === '23503') {
      throw new Error('Cannot delete destination with existing properties. Please hide it instead.');
    }
    throw err;
  }
}

/**
 * Reorders top cities positions in a single batched SQL UPDATE inside a transaction.
 */
export async function reorderTopCities(orderedIds: number[]): Promise<Location[]> {
  const validatedIds = locationReorderSchema.parse(orderedIds);
  const uniqueIds = Array.from(new Set(validatedIds));

  if (uniqueIds.length > 0) {
    const orderValues = sql.join(
      uniqueIds.map((id, idx) => sql`(${id}::int, ${idx + 1}::int)`),
      sql`, `
    );
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE ${locations} AS l
        SET position = v.pos
        FROM (VALUES ${orderValues}) AS v(id, pos)
        WHERE l.id = v.id
      `);
    });
  }

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
  if (!slug || typeof slug !== 'string') return null;
  const normalized = sanitizeSearchInput(slug, 100).toLowerCase();
  if (!normalized) return null;

  const rows = await db
    .select()
    .from(categories)
    .where(eq(sql`lower(${categories.slug})`, normalized))
    .limit(1);

  return rows.length > 0 ? mapCategoryRow(rows[0]) : null;
}

export interface AdminLocationsPaginatedParams {
  page?: number;
  pageSize?: number;
  continent?: string;
  status?: 'active' | 'inactive' | 'all';
  search?: string;
}

export interface AdminLocationsPaginatedResult {
  items: Location[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    all: number;
    active: number;
    inactive: number;
  };
}

/**
 * Lists locations for the Admin Portal using SQL LIMIT/OFFSET pagination,
 * filtered COUNT(*), and global active/inactive counts.
 */
export async function listAdminLocationsPaginated(
  params?: AdminLocationsPaginatedParams
): Promise<AdminLocationsPaginatedResult> {
  const { page, pageSize, offset } = normalizePagination(params?.page, params?.pageSize);

  const [aggRow] = await db
    .select({
      all: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${locations.isActive} = true)::int`,
      inactive: sql<number>`count(*) filter (where ${locations.isActive} = false)::int`,
    })
    .from(locations);

  const counts = {
    all: Number(aggRow?.all ?? 0),
    active: Number(aggRow?.active ?? 0),
    inactive: Number(aggRow?.inactive ?? 0),
  };

  const conditions: SQL[] = [];

  if (typeof params?.continent === 'string') {
    const cleanContinent = sanitizeSearchInput(params.continent, 100);
    if (cleanContinent && cleanContinent.toLowerCase() !== 'all') {
      conditions.push(eq(sql`lower(${locations.continent})`, cleanContinent.toLowerCase()));
    }
  }

  if (params?.status && params.status !== 'all') {
    if (params.status === 'active') {
      conditions.push(eq(locations.isActive, true));
    } else if (params.status === 'inactive') {
      conditions.push(eq(locations.isActive, false));
    } else {
      return { items: [], total: 0, page, pageSize, counts };
    }
  }

  if (typeof params?.search === 'string') {
    const cleanSearch = sanitizeSearchInput(params.search, 200);
    if (cleanSearch) {
      const pattern = `%${escapeIlike(cleanSearch, 200)}%`;
      const searchCond = or(
        ilike(locations.name, pattern),
        ilike(locations.city, pattern),
        ilike(locations.country, pattern),
        ilike(locations.slug, pattern)
      );
      if (searchCond) conditions.push(searchCond);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, itemRows] = await Promise.all([
    whereClause
      ? db.select({ count: sql<number>`count(*)::int` }).from(locations).where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(locations),
    whereClause
      ? db
          .select()
          .from(locations)
          .where(whereClause)
          .orderBy(asc(locations.position), asc(locations.id))
          .limit(pageSize)
          .offset(offset)
      : db
          .select()
          .from(locations)
          .orderBy(asc(locations.position), asc(locations.id))
          .limit(pageSize)
          .offset(offset),
  ]);

  return {
    items: itemRows.map(mapLocationRow),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
    counts,
  };
}
