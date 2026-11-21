import { eq, and, asc, sql } from 'drizzle-orm';
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
