import { eq, and, asc, desc, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { travelGuides } from '@/lib/db/schema';
import type { TravelGuide } from '@/lib/types';
import {
  createTravelGuideSchema,
  updateTravelGuideSchema,
  positiveIntIdSchema,
  sanitizeHtml,
} from '@/lib/validations/content';

function mapGuideRow(row: typeof travelGuides.$inferSelect): TravelGuide {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    city: row.city,
    category: row.category || 'City Guide',
    publishDate: row.createdAt.toISOString().slice(0, 10),
    featured: row.isFeatured,
    image: row.coverImage || '/seed/guide/placeholder.webp',
    excerpt: row.excerpt || '',
    content: row.content || '',
    seoTitle: row.seoTitle || undefined,
    seoDescription: row.seoDescription || undefined,
    status: row.status === 'draft' ? 'draft' : 'published',
    position: row.position,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parsePublishDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Lists travel guides from PostgreSQL with optional city, featured, and status filters.
 * Public callers see only published guides by default.
 */
export async function listTravelGuides(params?: {
  city?: string;
  featured?: boolean;
  status?: string;
  includeDrafts?: boolean;
}): Promise<TravelGuide[]> {
  const conditions = [];

  if (!params?.includeDrafts && !params?.status) {
    conditions.push(eq(travelGuides.status, 'published'));
  } else if (params?.status && params.status !== 'all') {
    conditions.push(eq(travelGuides.status, params.status));
  }

  if (params?.city && params.city !== 'all') {
    conditions.push(eq(sql`lower(${travelGuides.city})`, params.city.trim().toLowerCase()));
  }

  if (params?.featured != null) {
    conditions.push(eq(travelGuides.isFeatured, params.featured));
  }

  const query = db.select().from(travelGuides);
  const rows =
    conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(asc(travelGuides.position), asc(travelGuides.id))
      : await query.orderBy(asc(travelGuides.position), asc(travelGuides.id));

  return rows.map(mapGuideRow);
}

/**
 * Retrieves a travel guide article by URL slug.
 * Defaults to published guides only so draft articles are not exposed on public routes.
 */
export async function getTravelGuideBySlug(
  slug: string,
  options?: { includeDrafts?: boolean }
): Promise<TravelGuide | null> {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const conditions = [eq(travelGuides.slug, cleanSlug)];
  if (!options?.includeDrafts) {
    conditions.push(eq(travelGuides.status, 'published'));
  }

  const rows = await db
    .select()
    .from(travelGuides)
    .where(and(...conditions))
    .limit(1);

  return rows.length > 0 ? mapGuideRow(rows[0]) : null;
}

/**
 * Saves travel guide changes or creates a new article (admin CMS).
 */
export async function saveTravelGuide(data: Partial<TravelGuide>): Promise<TravelGuide> {
  if (data.id !== undefined) {
    const parsed = updateTravelGuideSchema.parse(data);
    const existing = await db
      .select()
      .from(travelGuides)
      .where(eq(travelGuides.id, parsed.id))
      .limit(1);

    if (existing.length > 0) {
      const updateValues: Partial<typeof travelGuides.$inferInsert> = {};

      if (parsed.title !== undefined) {
        updateValues.title = parsed.title;
        if (
          parsed.seoTitle === undefined &&
          (!existing[0].seoTitle || existing[0].seoTitle === existing[0].title)
        ) {
          updateValues.seoTitle = parsed.title;
        }
      }
      if (parsed.seoTitle !== undefined) {
        updateValues.seoTitle = parsed.seoTitle || null;
      }
      if (parsed.slug !== undefined) updateValues.slug = parsed.slug;
      if (parsed.city !== undefined) updateValues.city = parsed.city;
      if (parsed.category !== undefined) updateValues.category = parsed.category;
      if (parsed.featured !== undefined) updateValues.isFeatured = parsed.featured;
      if (parsed.image !== undefined) updateValues.coverImage = parsed.image;
      if (parsed.excerpt !== undefined) {
        updateValues.excerpt = parsed.excerpt;
        if (
          parsed.seoDescription === undefined &&
          (!existing[0].seoDescription || existing[0].seoDescription === existing[0].excerpt)
        ) {
          updateValues.seoDescription = parsed.excerpt;
        }
      }
      if (parsed.seoDescription !== undefined) {
        updateValues.seoDescription = parsed.seoDescription || null;
      }
      if (parsed.content !== undefined) {
        updateValues.content = sanitizeHtml(parsed.content);
      }
      if (parsed.status !== undefined) updateValues.status = parsed.status;
      if (parsed.position !== undefined) updateValues.position = parsed.position;

      const parsedDate = parsePublishDate(parsed.publishDate);
      if (parsedDate) updateValues.createdAt = parsedDate;

      if (Object.keys(updateValues).length === 0) {
        return mapGuideRow(existing[0]);
      }

      const [updated] = await db
        .update(travelGuides)
        .set(updateValues)
        .where(eq(travelGuides.id, parsed.id))
        .returning();

      return mapGuideRow(updated);
    }
  }

  const parsed = createTravelGuideSchema.parse({
    ...data,
    title: data.title || 'Untitled Guide',
  });

  const [maxPosRow] = await db
    .select({ maxPos: sql<number>`coalesce(max(${travelGuides.position}), 0)` })
    .from(travelGuides);
  const nextPosition = parsed.position ?? Number(maxPosRow?.maxPos ?? 0) + 1;

  const baseSlug = parsed.slug || slugify(parsed.title) || `guide-${nextPosition}`;
  const sanitizedContent = sanitizeHtml(parsed.content);
  const createdAt = parsePublishDate(parsed.publishDate) ?? new Date();

  const [created] = await db
    .insert(travelGuides)
    .values({
      slug: baseSlug,
      title: parsed.title,
      city: parsed.city,
      category: parsed.category,
      excerpt: parsed.excerpt,
      content: sanitizedContent,
      coverImage: parsed.image,
      isFeatured: parsed.featured,
      status: parsed.status,
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.excerpt,
      position: nextPosition,
      createdAt,
    })
    .returning();

  return mapGuideRow(created);
}

/**
 * Deletes a travel guide article by ID.
 */
export async function deleteTravelGuide(id: number): Promise<boolean> {
  const parsedId = positiveIntIdSchema.safeParse(id);
  if (!parsedId.success) return false;

  const deleted = await db
    .delete(travelGuides)
    .where(eq(travelGuides.id, parsedId.data))
    .returning({ id: travelGuides.id });

  return deleted.length > 0;
}

export interface AdminGuidesPaginatedParams {
  page?: number;
  pageSize?: number;
  city?: string;
  status?: 'published' | 'draft' | 'all';
  search?: string;
}

export interface AdminGuidesPaginatedResult {
  items: TravelGuide[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    all: number;
    published: number;
    draft: number;
  };
}

function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage =
    typeof page === 'number' && Number.isFinite(page)
      ? Math.min(Math.max(1, Math.floor(page)), 1_000_000)
      : 1;
  const rawSize =
    typeof pageSize === 'number' && Number.isFinite(pageSize) ? Math.floor(pageSize) : 20;
  const safePageSize = Math.min(Math.max(rawSize, 1), 100);
  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

/**
 * Lists travel guides for the Admin Portal using SQL LIMIT/OFFSET pagination,
 * filtered COUNT(*), and global published/draft counts.
 */
export async function listAdminGuidesPaginated(
  params?: AdminGuidesPaginatedParams
): Promise<AdminGuidesPaginatedResult> {
  const { page, pageSize, offset } = normalizePagination(params?.page, params?.pageSize);

  const [aggRow] = await db
    .select({
      all: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${travelGuides.status} = 'published')::int`,
      draft: sql<number>`count(*) filter (where ${travelGuides.status} = 'draft')::int`,
    })
    .from(travelGuides);

  const counts = {
    all: Number(aggRow?.all ?? 0),
    published: Number(aggRow?.published ?? 0),
    draft: Number(aggRow?.draft ?? 0),
  };

  const conditions: SQL[] = [];

  if (
    typeof params?.city === 'string' &&
    params.city.trim() &&
    params.city.trim().toLowerCase() !== 'all'
  ) {
    conditions.push(
      eq(sql`lower(${travelGuides.city})`, params.city.trim().slice(0, 100).toLowerCase())
    );
  }

  if (params?.status && params.status !== 'all') {
    if (params.status === 'published' || params.status === 'draft') {
      conditions.push(eq(travelGuides.status, params.status));
    } else {
      return { items: [], total: 0, page, pageSize, counts };
    }
  }

  if (typeof params?.search === 'string' && params.search.trim()) {
    const pattern = `%${escapeIlike(params.search.trim().slice(0, 200))}%`;
    const searchCond = or(
      ilike(travelGuides.title, pattern),
      ilike(travelGuides.slug, pattern),
      ilike(travelGuides.city, pattern),
      ilike(travelGuides.category, pattern)
    );
    if (searchCond) conditions.push(searchCond);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, itemRows] = await Promise.all([
    whereClause
      ? db.select({ count: sql<number>`count(*)::int` }).from(travelGuides).where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(travelGuides),
    whereClause
      ? db
          .select()
          .from(travelGuides)
          .where(whereClause)
          .orderBy(asc(travelGuides.position), desc(travelGuides.id))
          .limit(pageSize)
          .offset(offset)
      : db
          .select()
          .from(travelGuides)
          .orderBy(asc(travelGuides.position), desc(travelGuides.id))
          .limit(pageSize)
          .offset(offset),
  ]);

  return {
    items: itemRows.map(mapGuideRow),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
    counts,
  };
}
