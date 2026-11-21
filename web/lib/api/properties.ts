import {
  and,
  asc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  blockedDates,
  hostProfiles,
  locations,
  properties,
  reservations,
} from '@/lib/db/schema';
import type {
  Property,
  PropertyFilterParams,
  PropertyStatus,
  PropertyWorkstation,
} from '@/lib/types';
import {
  adminCreatePropertySchema,
  adminUpdatePropertySchema,
  createPropertySchema,
  featuredReorderSchema,
  int4IdSchema,
  isoDateStringSchema,
  nonNegativeInt4Schema,
  propertyStatusSchema,
  updatePropertySchema,
} from '@/lib/validations/property';
import { sanitizeHtml } from '@/lib/validations/content';

const DEFAULT_WORKSTATION: PropertyWorkstation = {
  hasWorkstation: true,
  desk: 'Standard Desk',
  chair: 'Ergonomic Chair',
  monitors: 'Ultrawide Monitor',
  keyboard: 'Standard',
  wifiSpeed: 300,
};

function parseWorkstation(raw: Record<string, unknown> | null): PropertyWorkstation {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_WORKSTATION };
  }
  return {
    hasWorkstation:
      typeof raw.hasWorkstation === 'boolean'
        ? raw.hasWorkstation
        : DEFAULT_WORKSTATION.hasWorkstation,
    desk: typeof raw.desk === 'string' ? raw.desk : DEFAULT_WORKSTATION.desk,
    chair: typeof raw.chair === 'string' ? raw.chair : DEFAULT_WORKSTATION.chair,
    monitors:
      typeof raw.monitors === 'string' ? raw.monitors : DEFAULT_WORKSTATION.monitors,
    keyboard:
      typeof raw.keyboard === 'string' ? raw.keyboard : DEFAULT_WORKSTATION.keyboard,
    wifiSpeed:
      typeof raw.wifiSpeed === 'number' && Number.isFinite(raw.wifiSpeed)
        ? raw.wifiSpeed
        : DEFAULT_WORKSTATION.wifiSpeed,
  };
}

export function mapPropertyRow(row: typeof properties.$inferSelect): Property {
  return {
    id: row.id,
    reference: row.reference || `ND-PROP-${row.id}`,
    title: row.title,
    slug: row.slug || `property-${row.id}`,
    description: row.description || '',
    pricePerMonth: row.pricePerMonth,
    currency: row.currency,
    locationId: row.locationId ?? 0,
    city: row.city,
    country: row.country || '',
    neighborhood: row.neighborhood || '',
    address: row.address || '',
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    totalSurface: row.totalSurface ?? 0,
    maxGuests: row.maxGuests,
    bedsCount: row.bedsCount,
    kitchen: row.kitchen,
    laundry: row.laundry,
    balcony: row.balcony,
    petFriendly: row.petFriendly,
    pool: row.pool,
    gym: row.gym,
    terrace: row.terrace,
    workstation: parseWorkstation(row.workstation),
    houseRules: row.houseRules || '',
    checkInStart: row.checkInStart,
    checkOut: row.checkOut,
    minimumStayNights: row.minimumStayNights,
    isFeatured: row.featuredPosition != null,
    featuredPosition: row.featuredPosition ?? null,
    isDirectBooking: row.isDirectBooking,
    images: Array.isArray(row.images) ? row.images : [],
    hostId: row.hostId ?? 0,
    status: row.status as PropertyStatus,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
  };
}

function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Lists properties matching filter criteria from PostgreSQL.
 * Defaults to 'published' properties belonging to 'approved' hosts (AC-LIST-6).
 */
export async function listProperties(params?: PropertyFilterParams): Promise<Property[]> {
  const conditions: SQL[] = [];
  const requireApprovedHost = !params?.status;

  if (params?.status === 'all') {
    // Return properties of all statuses
  } else if (params?.status) {
    const validStatus = propertyStatusSchema.safeParse(params.status);
    if (!validStatus.success) return [];
    conditions.push(eq(properties.status, validStatus.data));
  } else {
    conditions.push(eq(properties.status, 'published'));
    conditions.push(eq(hostProfiles.status, 'approved'));
  }

  // City filter (case-insensitive substring on city or neighborhood)
  if (params?.city && params.city.trim()) {
    const pattern = `%${escapeIlike(params.city.trim())}%`;
    const cityCond = or(
      ilike(properties.city, pattern),
      ilike(properties.neighborhood, pattern)
    );
    if (cityCond) conditions.push(cityCond);
  }

  // Location ID filter
  if (params?.locationId != null) {
    const parsedLoc = int4IdSchema.safeParse(params.locationId);
    if (!parsedLoc.success) return [];
    conditions.push(eq(properties.locationId, parsedLoc.data));
  }

  // Neighborhood filter (case-insensitive exact match)
  if (params?.neighborhood && params.neighborhood.trim()) {
    conditions.push(
      eq(sql`lower(${properties.neighborhood})`, params.neighborhood.trim().toLowerCase())
    );
  }

  // Host filter
  if (params?.hostId != null) {
    const parsedHost = int4IdSchema.safeParse(params.hostId);
    if (!parsedHost.success) return [];
    conditions.push(eq(properties.hostId, parsedHost.data));
  }

  // Featured filter
  if (params?.featured) {
    conditions.push(isNotNull(properties.featuredPosition));
  }

  // Bedrooms filter (exact or minimum)
  if (params?.bedrooms != null) {
    const parsedBedrooms = nonNegativeInt4Schema.safeParse(params.bedrooms);
    if (!parsedBedrooms.success) return [];
    if (params.exactBedrooms) {
      conditions.push(eq(properties.bedrooms, parsedBedrooms.data));
    } else {
      conditions.push(gte(properties.bedrooms, parsedBedrooms.data));
    }
  }

  // Price range filters (USD cents)
  if (params?.minPrice != null) {
    const parsedMin = nonNegativeInt4Schema.safeParse(params.minPrice);
    if (!parsedMin.success) return [];
    conditions.push(gte(properties.pricePerMonth, parsedMin.data));
  }
  if (params?.maxPrice != null) {
    const parsedMax = nonNegativeInt4Schema.safeParse(params.maxPrice);
    if (!parsedMax.success) return [];
    conditions.push(lte(properties.pricePerMonth, parsedMax.data));
  }

  // Direct booking (Instant Book) filter
  if (params?.isDirectBooking != null) {
    conditions.push(eq(properties.isDirectBooking, params.isDirectBooking));
  }

  // Minimum verified Wi-Fi speed (Mbps) inside jsonb workstation column
  if (params?.minWifiSpeed != null) {
    const parsedWifi = nonNegativeInt4Schema.safeParse(params.minWifiSpeed);
    if (!parsedWifi.success) return [];
    conditions.push(
      sql`CASE WHEN (${properties.workstation}->>'wifiSpeed') ~ '^[0-9]+$' THEN (${properties.workstation}->>'wifiSpeed')::int ELSE 0 END >= ${parsedWifi.data}`
    );
  }

  // Amenities filter
  if (params?.amenities && params.amenities.length > 0) {
    for (const rawAmenity of params.amenities) {
      const amenity = rawAmenity.toLowerCase();
      if (amenity === 'kitchen') conditions.push(eq(properties.kitchen, true));
      else if (amenity === 'laundry') conditions.push(eq(properties.laundry, true));
      else if (amenity === 'balcony') conditions.push(eq(properties.balcony, true));
      else if (amenity === 'petfriendly' || amenity === 'pet_friendly' || amenity === 'pets') {
        conditions.push(eq(properties.petFriendly, true));
      } else if (amenity === 'pool' || amenity === 'swimming_pool') {
        conditions.push(eq(properties.pool, true));
      } else if (amenity === 'gym') conditions.push(eq(properties.gym, true));
      else if (amenity === 'terrace') conditions.push(eq(properties.terrace, true));
      else if (amenity === 'workstation') {
        conditions.push(
          sql`coalesce((${properties.workstation}->>'hasWorkstation')::boolean, false) = true`
        );
      }
    }
  }

  // Date availability filter: exclude properties with overlapping blocked_dates or active reservations
  if (params?.moveIn && params?.moveOut) {
    const validIn = isoDateStringSchema.safeParse(params.moveIn);
    const validOut = isoDateStringSchema.safeParse(params.moveOut);
    if (validIn.success && validOut.success && validIn.data < validOut.data) {
      const moveIn = validIn.data;
      const moveOut = validOut.data;

      conditions.push(
        notExists(
          db
            .select({ id: blockedDates.id })
            .from(blockedDates)
            .where(
              and(
                eq(blockedDates.propertyId, properties.id),
                sql`${blockedDates.startDate} < ${moveOut}::date`,
                sql`${blockedDates.endDate} > ${moveIn}::date`
              )
            )
        )
      );

      conditions.push(
        notExists(
          db
            .select({ id: reservations.id })
            .from(reservations)
            .where(
              and(
                eq(reservations.propertyId, properties.id),
                inArray(reservations.status, ['pending', 'confirmed']),
                sql`${reservations.moveInDate} < ${moveOut}::date`,
                sql`${reservations.moveOutDate} > ${moveIn}::date`
              )
            )
        )
      );
    }
  }

  const orderClause = params?.featured
    ? [asc(properties.featuredPosition), asc(properties.id)]
    : [asc(properties.id)];

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  if (requireApprovedHost) {
    const rows = await db
      .select({ property: properties })
      .from(properties)
      .innerJoin(hostProfiles, eq(properties.hostId, hostProfiles.id))
      .where(whereClause)
      .orderBy(...orderClause);
    return rows.map((r) => mapPropertyRow(r.property));
  }

  const rows = whereClause
    ? await db.select().from(properties).where(whereClause).orderBy(...orderClause)
    : await db.select().from(properties).orderBy(...orderClause);

  return rows.map(mapPropertyRow);
}

/**
 * Retrieves a property by its URL slug.
 * By default requires property to be 'published' and its host 'approved' (AC-LIST-6).
 */
export async function getPropertyBySlug(
  slug: string,
  options?: { allowUnpublished?: boolean }
): Promise<Property | null> {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  if (!options?.allowUnpublished) {
    const rows = await db
      .select({ property: properties })
      .from(properties)
      .innerJoin(hostProfiles, eq(properties.hostId, hostProfiles.id))
      .where(
        and(
          eq(properties.slug, cleanSlug),
          eq(properties.status, 'published'),
          eq(hostProfiles.status, 'approved')
        )
      )
      .limit(1);

    return rows.length > 0 ? mapPropertyRow(rows[0].property) : null;
  }

  const rows = await db
    .select()
    .from(properties)
    .where(eq(properties.slug, cleanSlug))
    .limit(1);

  return rows.length > 0 ? mapPropertyRow(rows[0]) : null;
}

/**
 * Retrieves a property by its unique ID.
 */
export async function getPropertyById(id: number): Promise<Property | null> {
  const parsed = int4IdSchema.safeParse(id);
  if (!parsed.success) return null;

  const rows = await db
    .select()
    .from(properties)
    .where(eq(properties.id, parsed.data))
    .limit(1);

  return rows.length > 0 ? mapPropertyRow(rows[0]) : null;
}

/**
 * Lists all properties belonging to a specific host.
 */
export async function listHostListings(hostId: number): Promise<Property[]> {
  const parsed = int4IdSchema.safeParse(hostId);
  if (!parsed.success) return [];

  const rows = await db
    .select()
    .from(properties)
    .where(eq(properties.hostId, parsed.data))
    .orderBy(asc(properties.id));

  return rows.map(mapPropertyRow);
}

async function resolveLocationId(
  locationId?: number | null,
  cityName?: string
): Promise<number | null> {
  let resolvedLocationId: number | null = locationId ?? null;
  if (resolvedLocationId != null) {
    const locExists = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, resolvedLocationId))
      .limit(1);
    if (locExists.length === 0) {
      resolvedLocationId = null;
    }
  }
  if (resolvedLocationId == null && cityName) {
    const matchedLoc = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(sql`lower(${locations.city})`, cityName.trim().toLowerCase()))
      .limit(1);
    resolvedLocationId = matchedLoc.length > 0 ? matchedLoc[0].id : null;
  }
  return resolvedLocationId;
}

function buildUpdatePayload(parsed: ReturnType<typeof adminUpdatePropertySchema.parse>) {
  const payload: Partial<typeof properties.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.hostId !== undefined) payload.hostId = parsed.hostId;
  if (parsed.title !== undefined) payload.title = parsed.title;
  if (parsed.slug !== undefined) payload.slug = parsed.slug;
  if (parsed.reference !== undefined) payload.reference = parsed.reference;
  if (parsed.description !== undefined) {
    payload.description = sanitizeHtml(parsed.description);
  }
  if (parsed.pricePerMonth !== undefined) payload.pricePerMonth = parsed.pricePerMonth;
  if (parsed.currency !== undefined) payload.currency = parsed.currency;
  if (parsed.locationId !== undefined) payload.locationId = parsed.locationId;
  if (parsed.city !== undefined) payload.city = parsed.city;
  if (parsed.country !== undefined) payload.country = parsed.country;
  if (parsed.neighborhood !== undefined) payload.neighborhood = parsed.neighborhood;
  if (parsed.address !== undefined) payload.address = parsed.address;
  if (parsed.bedrooms !== undefined) payload.bedrooms = parsed.bedrooms;
  if (parsed.bathrooms !== undefined) payload.bathrooms = parsed.bathrooms;
  if (parsed.bedsCount !== undefined) payload.bedsCount = parsed.bedsCount;
  if (parsed.totalSurface !== undefined) payload.totalSurface = parsed.totalSurface;
  if (parsed.maxGuests !== undefined) payload.maxGuests = parsed.maxGuests;
  if (parsed.kitchen !== undefined) payload.kitchen = parsed.kitchen;
  if (parsed.laundry !== undefined) payload.laundry = parsed.laundry;
  if (parsed.balcony !== undefined) payload.balcony = parsed.balcony;
  if (parsed.petFriendly !== undefined) payload.petFriendly = parsed.petFriendly;
  if (parsed.pool !== undefined) payload.pool = parsed.pool;
  if (parsed.gym !== undefined) payload.gym = parsed.gym;
  if (parsed.terrace !== undefined) payload.terrace = parsed.terrace;
  if (parsed.workstation !== undefined) {
    payload.workstation = parsed.workstation as unknown as Record<string, unknown>;
  }
  if (parsed.houseRules !== undefined) {
    payload.houseRules = sanitizeHtml(parsed.houseRules);
  }
  if (parsed.checkInStart !== undefined) payload.checkInStart = parsed.checkInStart;
  if (parsed.checkOut !== undefined) payload.checkOut = parsed.checkOut;
  if (parsed.minimumStayNights !== undefined) {
    payload.minimumStayNights = parsed.minimumStayNights;
  }
  if (parsed.isDirectBooking !== undefined) {
    payload.isDirectBooking = parsed.isDirectBooking;
  }
  if (parsed.images !== undefined) payload.images = parsed.images;
  if (parsed.featuredPosition !== undefined) {
    payload.featuredPosition = parsed.featuredPosition;
  }
  if (parsed.status !== undefined) payload.status = parsed.status;
  if (parsed.rejectionReason !== undefined) {
    payload.rejectionReason = parsed.rejectionReason;
  }

  return payload;
}

/**
 * Saves a host listing (creates new draft or updates existing property).
 * Enforces host ownership on updates to prevent IDOR.
 */
export async function saveHostListing(
  hostId: number,
  data: Partial<Property>
): Promise<Property> {
  const validHostId = int4IdSchema.parse(hostId);

  if (data.id != null) {
    const validId = int4IdSchema.parse(data.id);
    const existingRows = await db
      .select()
      .from(properties)
      .where(eq(properties.id, validId))
      .limit(1);

    if (existingRows.length === 0) {
      throw new Error(`Property ${validId} not found`);
    }

    const existing = existingRows[0];
    if (existing.hostId !== validHostId) {
      throw new Error('Unauthorized: property does not belong to this host');
    }

    const parsed = updatePropertySchema.parse(data);
    // Hosts cannot directly self-publish listings; require admin moderation
    if (parsed.status === 'published' && existing.status !== 'published') {
      throw new Error('Hosts cannot publish listings directly; submit for review instead');
    }
    const payload = buildUpdatePayload(parsed);
    // Prevent hosts from self-featuring listings or overwriting admin moderation fields
    delete payload.featuredPosition;
    delete payload.rejectionReason;

    const updatedRows = await db
      .update(properties)
      .set(payload)
      .where(and(eq(properties.id, validId), eq(properties.hostId, validHostId)))
      .returning();

    return mapPropertyRow(updatedRows[0]);
  }

  // Create new listing inside a transaction with advisory lock (properties.id is non-serial integer PK)
  const parsed = createPropertySchema.parse(data);
  if (parsed.status === 'published') {
    throw new Error('Hosts cannot publish listings directly; submit for review instead');
  }
  const initialStatus: PropertyStatus =
    parsed.status === 'pending_review' ? 'pending_review' : 'draft';
  const cityName = parsed.city || 'Madrid';

  // Resolve valid locationId foreign key from locations table if not explicitly provided
  const resolvedLocationId = await resolveLocationId(parsed.locationId, cityName);

  const inserted = await db.transaction(async (tx) => {
    // Advisory lock prevents concurrent max(id)+1 collisions on non-serial integer PK
    await tx.execute(sql`SELECT pg_advisory_xact_lock(728391)`);

    const maxRow = await tx
      .select({ maxId: sql<number>`coalesce(max(${properties.id}), 0)` })
      .from(properties);
    const newId = Number(maxRow[0]?.maxId ?? 0) + 1;

    const cleanTitleSlug = (parsed.title || `property-${newId}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let finalSlug = parsed.slug || cleanTitleSlug || `property-${newId}`;

    // Ensure slug uniqueness
    const slugConflict = await tx
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.slug, finalSlug))
      .limit(1);
    if (slugConflict.length > 0) {
      finalSlug = `${finalSlug}-${newId}`;
    }

    const now = new Date();
    const rows = await tx
      .insert(properties)
      .values({
        id: newId,
        hostId: validHostId,
        reference: parsed.reference || `ND-PROP-${newId}`,
        title: parsed.title || 'Untitled Property',
        slug: finalSlug,
        description: sanitizeHtml(parsed.description ?? ''),
        pricePerMonth: parsed.pricePerMonth ?? 200000,
        currency: parsed.currency || 'USD',
        locationId: resolvedLocationId,
        city: cityName,
        country: parsed.country || 'Spain',
        neighborhood: parsed.neighborhood ?? '',
        address: parsed.address ?? '',
        bedrooms: parsed.bedrooms ?? 1,
        bathrooms: parsed.bathrooms ?? 1,
        bedsCount: parsed.bedsCount ?? 1,
        totalSurface: parsed.totalSurface ?? 50,
        maxGuests: parsed.maxGuests ?? 2,
        kitchen: parsed.kitchen ?? true,
        laundry: parsed.laundry ?? true,
        balcony: parsed.balcony ?? false,
        petFriendly: parsed.petFriendly ?? false,
        pool: parsed.pool ?? false,
        gym: parsed.gym ?? false,
        terrace: parsed.terrace ?? false,
        workstation: (parsed.workstation ?? DEFAULT_WORKSTATION) as unknown as Record<
          string,
          unknown
        >,
        houseRules: sanitizeHtml(
          parsed.houseRules || 'No smoking. Quiet hours 22:00 - 08:00.'
        ),
        checkInStart: parsed.checkInStart || '15:00',
        checkOut: parsed.checkOut || '11:00',
        minimumStayNights: parsed.minimumStayNights ?? 30,
        isDirectBooking: parsed.isDirectBooking ?? false,
        images:
          parsed.images && parsed.images.length > 0
            ? parsed.images
            : ['/seed/property/prop-madrid-1.webp'],
        featuredPosition: null,
        status: initialStatus,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return rows[0];
  });

  return mapPropertyRow(inserted);
}

/**
 * Creates a new property directly from the Admin Portal (defaults to 'published').
 * Requires a valid hostId and enforces minimumStayNights >= 30.
 */
export async function createAdminProperty(
  data: Partial<Property> & { hostId: number }
): Promise<Property> {
  const parsed = adminCreatePropertySchema.parse(data);

  const hostExists = await db
    .select({ id: hostProfiles.id })
    .from(hostProfiles)
    .where(eq(hostProfiles.id, parsed.hostId))
    .limit(1);
  if (hostExists.length === 0) {
    throw new Error(`Host profile ${parsed.hostId} not found`);
  }

  const cityName = parsed.city || 'Madrid';
  const resolvedLocationId = await resolveLocationId(parsed.locationId, cityName);

  const inserted = await db.transaction(async (tx) => {
    // Advisory lock prevents concurrent max(id)+1 collisions on non-serial integer PK
    await tx.execute(sql`SELECT pg_advisory_xact_lock(728391)`);

    const maxRow = await tx
      .select({ maxId: sql<number>`coalesce(max(${properties.id}), 0)` })
      .from(properties);
    const newId = Number(maxRow[0]?.maxId ?? 0) + 1;

    const cleanTitleSlug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let finalSlug = parsed.slug || cleanTitleSlug || `property-${newId}`;

    const slugConflict = await tx
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.slug, finalSlug))
      .limit(1);
    if (slugConflict.length > 0) {
      finalSlug = `${finalSlug}-${newId}`;
    }

    const now = new Date();
    const rows = await tx
      .insert(properties)
      .values({
        id: newId,
        hostId: parsed.hostId,
        reference: parsed.reference || `ND-PROP-${newId}`,
        title: parsed.title,
        slug: finalSlug,
        description: sanitizeHtml(parsed.description ?? ''),
        pricePerMonth: parsed.pricePerMonth ?? 200000,
        currency: parsed.currency || 'USD',
        locationId: resolvedLocationId,
        city: cityName,
        country: parsed.country || 'Spain',
        neighborhood: parsed.neighborhood ?? '',
        address: parsed.address ?? '',
        bedrooms: parsed.bedrooms ?? 1,
        bathrooms: parsed.bathrooms ?? 1,
        bedsCount: parsed.bedsCount ?? 1,
        totalSurface: parsed.totalSurface ?? 50,
        maxGuests: parsed.maxGuests ?? 2,
        kitchen: parsed.kitchen ?? true,
        laundry: parsed.laundry ?? true,
        balcony: parsed.balcony ?? false,
        petFriendly: parsed.petFriendly ?? false,
        pool: parsed.pool ?? false,
        gym: parsed.gym ?? false,
        terrace: parsed.terrace ?? false,
        workstation: (parsed.workstation ?? DEFAULT_WORKSTATION) as unknown as Record<
          string,
          unknown
        >,
        houseRules: sanitizeHtml(
          parsed.houseRules || 'No smoking. Quiet hours 22:00 - 08:00.'
        ),
        checkInStart: parsed.checkInStart || '15:00',
        checkOut: parsed.checkOut || '11:00',
        minimumStayNights: parsed.minimumStayNights,
        isDirectBooking: parsed.isDirectBooking ?? false,
        images:
          parsed.images && parsed.images.length > 0
            ? parsed.images
            : ['/seed/property/prop-madrid-1.webp'],
        featuredPosition: parsed.featuredPosition ?? null,
        status: parsed.status,
        rejectionReason: parsed.rejectionReason ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return rows[0];
  });

  return mapPropertyRow(inserted);
}

/**
 * Updates a property status (e.g. publish, reject, hide) by admin or host lifecycle.
 */
export async function updatePropertyStatus(
  id: number,
  status: PropertyStatus,
  rejectionReason?: string | null
): Promise<Property | null> {
  const parsedId = int4IdSchema.safeParse(id);
  if (!parsedId.success) return null;
  const validStatus = propertyStatusSchema.parse(status);

  const setPayload: Partial<typeof properties.$inferInsert> = {
    status: validStatus,
    updatedAt: new Date(),
  };
  if (rejectionReason !== undefined) {
    setPayload.rejectionReason = rejectionReason;
  }

  const rows = await db
    .update(properties)
    .set(setPayload)
    .where(eq(properties.id, parsedId.data))
    .returning();

  return rows.length > 0 ? mapPropertyRow(rows[0]) : null;
}

/**
 * Updates a property with arbitrary partial data (admin portal).
 * Supports reassigning hostId, sanitizing HTML, and resolving locationId when city changes.
 */
export async function updateProperty(
  id: number,
  data: Partial<Property>
): Promise<Property | null> {
  const parsedId = int4IdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const parsed = adminUpdatePropertySchema.parse(data);

  if (parsed.hostId !== undefined) {
    const hostExists = await db
      .select({ id: hostProfiles.id })
      .from(hostProfiles)
      .where(eq(hostProfiles.id, parsed.hostId))
      .limit(1);
    if (hostExists.length === 0) {
      throw new Error(`Host profile ${parsed.hostId} not found`);
    }
  }

  const payload = buildUpdatePayload(parsed);

  if (parsed.locationId !== undefined) {
    payload.locationId = await resolveLocationId(parsed.locationId, parsed.city);
  } else if (parsed.city !== undefined) {
    payload.locationId = await resolveLocationId(null, parsed.city);
  }

  const rows = await db
    .update(properties)
    .set(payload)
    .where(eq(properties.id, parsedId.data))
    .returning();

  return rows.length > 0 ? mapPropertyRow(rows[0]) : null;
}

/**
 * Reorders featured properties on the homepage (AC-CMS-4, D20).
 * Top #1 becomes the 3D showcase property.
 */
export async function reorderFeaturedProperties(orderedIds: number[]): Promise<Property[]> {
  const validIds = featuredReorderSchema.parse(orderedIds);
  const uniqueIds = Array.from(new Set(validIds));

  const rows = await db.transaction(async (tx) => {
    await tx.update(properties).set({ featuredPosition: null });

    for (let i = 0; i < uniqueIds.length; i++) {
      await tx
        .update(properties)
        .set({ featuredPosition: i + 1, updatedAt: new Date() })
        .where(eq(properties.id, uniqueIds[i]));
    }

    return tx
      .select()
      .from(properties)
      .where(isNotNull(properties.featuredPosition))
      .orderBy(asc(properties.featuredPosition), asc(properties.id));
  });

  return rows.map(mapPropertyRow);
}

/**
 * Deletes a property by ID (admin portal).
 * Blocks deletion when existing reservations reference this property.
 */
export async function deleteProperty(id: number): Promise<boolean> {
  const parsedId = int4IdSchema.safeParse(id);
  if (!parsedId.success) return false;

  const refRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservations)
    .where(eq(reservations.propertyId, parsedId.data));

  if ((refRows[0]?.count ?? 0) > 0) {
    throw new Error(
      'Cannot delete property with existing reservations. Please hide it instead.'
    );
  }

  const deleted = await db
    .delete(properties)
    .where(eq(properties.id, parsedId.data))
    .returning({ id: properties.id });

  return deleted.length > 0;
}
