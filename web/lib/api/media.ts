import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  blogPosts,
  communityVideos,
  hostProfiles,
  locations,
  media,
  properties,
  travelGuides,
} from '@/lib/db/schema';
import { deleteUploadFile, saveUploadedFile } from '@/lib/storage/upload';
import type { MediaItem, MediaListResult, UploadActor } from '@/lib/types';

const INT4_MAX = 2_147_483_647;
const MAX_ALT_LENGTH = 255;

export type MediaServiceErrorStatus = 400 | 403 | 404 | 409;

export class MediaServiceError extends Error {
  readonly status: MediaServiceErrorStatus;

  constructor(message: string, status: MediaServiceErrorStatus) {
    super(message);
    this.name = 'MediaServiceError';
    this.status = status;
  }
}

export interface UploadMediaOptions {
  alt?: string;
  uploadDir?: string;
  fieldName?: string;
}

export interface ListMediaParams {
  page?: number;
  pageSize?: number;
  search?: string;
  uploadedBy?: number;
}

export interface DeleteMediaOptions {
  uploadDir?: string;
}

export interface DeleteMediaResult {
  deleted: true;
  id: number;
  storageKey: string;
}

function mapMediaRow(row: typeof media.$inferSelect, usageCount: number = 0): MediaItem {
  return {
    id: row.id,
    url: row.url,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    alt: row.alt ?? null,
    uploadedBy: row.uploadedBy ?? null,
    createdAt: row.createdAt.toISOString(),
    isInUse: usageCount > 0,
    usageCount,
  };
}

function normalizeAlt(alt?: string | null): string | null {
  if (typeof alt !== 'string') return null;
  const trimmed = alt.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_ALT_LENGTH);
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
    typeof pageSize === 'number' && Number.isFinite(pageSize) ? Math.floor(pageSize) : 24;
  const safePageSize = Math.min(Math.max(rawSize, 1), 60);

  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

/**
 * Processes and stores an uploaded image on disk, then inserts its metadata row.
 * Deletes the stored file if the DB insert fails so no orphan files remain.
 */
export async function uploadMediaFile(
  input: Buffer | Blob | FormData,
  actor: UploadActor,
  options?: UploadMediaOptions,
): Promise<MediaItem> {
  const saved = await saveUploadedFile(input, {
    uploadDir: options?.uploadDir,
    fieldName: options?.fieldName,
  });

  try {
    const [inserted] = await db
      .insert(media)
      .values({
        url: saved.url,
        storageKey: saved.storageKey,
        mimeType: saved.mimeType,
        width: saved.width,
        height: saved.height,
        sizeBytes: saved.sizeBytes,
        alt: normalizeAlt(options?.alt),
        uploadedBy: actor.user.id,
      })
      .returning();

    if (!inserted) {
      throw new Error('Failed to insert media record');
    }

    return mapMediaRow(inserted, 0);
  } catch (error) {
    try {
      await deleteUploadFile(saved.storageKey, { uploadDir: options?.uploadDir });
    } catch (cleanupError) {
      console.error('[media] Failed to delete orphaned file after DB error:', cleanupError);
    }
    throw error;
  }
}

/**
 * Checks whether a media URL is referenced across all 6 content/entity tables.
 */
export async function findMediaUsages(url: string): Promise<string[]> {
  const normalizedUrl = url.trim();
  if (normalizedUrl.length === 0) {
    return [];
  }

  const [propRows, locRows, guideRows, blogRows, videoRows, hostRows] = await Promise.all([
    db
      .select({ id: properties.id })
      .from(properties)
      .where(
        or(
          sql`${properties.images} @> jsonb_build_array(${normalizedUrl}::text)`,
          sql`strpos(coalesce(${properties.description}, ''), ${normalizedUrl}) > 0`,
          sql`strpos(coalesce(${properties.houseRules}, ''), ${normalizedUrl}) > 0`,
        ),
      ),
    db
      .select({ id: locations.id })
      .from(locations)
      .where(
        or(
          eq(locations.image, normalizedUrl),
          sql`strpos(coalesce(${locations.description}, ''), ${normalizedUrl}) > 0`,
        ),
      ),
    db
      .select({ id: travelGuides.id })
      .from(travelGuides)
      .where(
        or(
          eq(travelGuides.coverImage, normalizedUrl),
          sql`strpos(coalesce(${travelGuides.content}, ''), ${normalizedUrl}) > 0`,
        ),
      ),
    db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(
        or(
          eq(blogPosts.coverImage, normalizedUrl),
          sql`strpos(coalesce(${blogPosts.content}, ''), ${normalizedUrl}) > 0`,
        ),
      ),
    db
      .select({ id: communityVideos.id })
      .from(communityVideos)
      .where(eq(communityVideos.thumbnailUrl, normalizedUrl)),
    db
      .select({ id: hostProfiles.id })
      .from(hostProfiles)
      .where(eq(hostProfiles.avatar, normalizedUrl)),
  ]);

  return [
    ...propRows.map((row) => `property:${row.id}`),
    ...locRows.map((row) => `location:${row.id}`),
    ...guideRows.map((row) => `travel_guide:${row.id}`),
    ...blogRows.map((row) => `blog_post:${row.id}`),
    ...videoRows.map((row) => `community_video:${row.id}`),
    ...hostRows.map((row) => `host_profile:${row.id}`),
  ];
}

// Batch usage counts for a page of URLs in 6 queries instead of 6*N queries
async function findMediaUsageCounts(urls: string[]): Promise<Map<string, number>> {
  const uniqueUrls = Array.from(
    new Set(urls.map((u) => u.trim()).filter((u) => u.length > 0)),
  );
  const counts = new Map<string, number>();

  if (uniqueUrls.length === 0) {
    return counts;
  }

  const urlValues = sql.join(
    uniqueUrls.map((u) => sql`(${u}::text)`),
    sql`, `,
  );

  const [propRes, locRes, guideRes, blogRes, videoRows, hostRows] = await Promise.all([
    db.execute<{ url: string; cnt: number }>(sql`
      SELECT u.url, count(*)::int AS cnt
      FROM (VALUES ${urlValues}) AS u(url)
      JOIN ${properties} ON (
        ${properties.images} @> jsonb_build_array(u.url)
        OR strpos(coalesce(${properties.description}, ''), u.url) > 0
        OR strpos(coalesce(${properties.houseRules}, ''), u.url) > 0
      )
      GROUP BY u.url
    `),
    db.execute<{ url: string; cnt: number }>(sql`
      SELECT u.url, count(*)::int AS cnt
      FROM (VALUES ${urlValues}) AS u(url)
      JOIN ${locations} ON (
        ${locations.image} = u.url
        OR strpos(coalesce(${locations.description}, ''), u.url) > 0
      )
      GROUP BY u.url
    `),
    db.execute<{ url: string; cnt: number }>(sql`
      SELECT u.url, count(*)::int AS cnt
      FROM (VALUES ${urlValues}) AS u(url)
      JOIN ${travelGuides} ON (
        ${travelGuides.coverImage} = u.url
        OR strpos(coalesce(${travelGuides.content}, ''), u.url) > 0
      )
      GROUP BY u.url
    `),
    db.execute<{ url: string; cnt: number }>(sql`
      SELECT u.url, count(*)::int AS cnt
      FROM (VALUES ${urlValues}) AS u(url)
      JOIN ${blogPosts} ON (
        ${blogPosts.coverImage} = u.url
        OR strpos(coalesce(${blogPosts.content}, ''), u.url) > 0
      )
      GROUP BY u.url
    `),
    db
      .select({
        url: communityVideos.thumbnailUrl,
        cnt: sql<number>`count(*)::int`,
      })
      .from(communityVideos)
      .where(inArray(communityVideos.thumbnailUrl, uniqueUrls))
      .groupBy(communityVideos.thumbnailUrl),
    db
      .select({
        url: hostProfiles.avatar,
        cnt: sql<number>`count(*)::int`,
      })
      .from(hostProfiles)
      .where(inArray(hostProfiles.avatar, uniqueUrls))
      .groupBy(hostProfiles.avatar),
  ]);

  const addCounts = (rows: Array<{ url: string | null; cnt: number }>) => {
    for (const row of rows) {
      if (!row.url) continue;
      counts.set(row.url, (counts.get(row.url) ?? 0) + Number(row.cnt ?? 0));
    }
  };

  addCounts(propRes.rows);
  addCounts(locRes.rows);
  addCounts(guideRes.rows);
  addCounts(blogRes.rows);
  addCounts(videoRows);
  addCounts(hostRows);

  return counts;
}

/**
 * Lists uploaded media using SQL LIMIT/OFFSET pagination with live reference counts.
 */
export async function listMediaPaginated(
  params?: ListMediaParams,
): Promise<MediaListResult> {
  const { page, pageSize, offset } = normalizePagination(params?.page, params?.pageSize);

  const conditions: SQL[] = [];

  if (typeof params?.uploadedBy === 'number') {
    if (
      !Number.isInteger(params.uploadedBy) ||
      params.uploadedBy <= 0 ||
      params.uploadedBy > INT4_MAX
    ) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }
    conditions.push(eq(media.uploadedBy, params.uploadedBy));
  }

  if (typeof params?.search === 'string' && params.search.trim().length > 0) {
    const pattern = `%${escapeIlike(params.search.trim().slice(0, 100))}%`;
    const searchCond = or(
      ilike(media.alt, pattern),
      ilike(media.url, pattern),
      ilike(media.storageKey, pattern),
    );
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, rows] = await Promise.all([
    whereClause
      ? db.select({ count: sql<number>`count(*)::int` }).from(media).where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(media),
    whereClause
      ? db
          .select()
          .from(media)
          .where(whereClause)
          .orderBy(desc(media.createdAt), desc(media.id))
          .limit(pageSize)
          .offset(offset)
      : db
          .select()
          .from(media)
          .orderBy(desc(media.createdAt), desc(media.id))
          .limit(pageSize)
          .offset(offset),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const usageCounts = await findMediaUsageCounts(rows.map((row) => row.url));

  return {
    items: rows.map((row) => mapMediaRow(row, usageCounts.get(row.url) ?? 0)),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Deletes a media record and its file on disk if owned by the actor (or admin)
 * and not referenced anywhere in the database.
 */
export async function deleteUnusedMedia(
  id: number,
  actor: UploadActor,
  options?: DeleteMediaOptions,
): Promise<DeleteMediaResult> {
  if (!Number.isInteger(id) || id <= 0 || id > INT4_MAX) {
    throw new MediaServiceError('Invalid media ID.', 400);
  }

  const [row] = await db
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  if (!row) {
    throw new MediaServiceError('Media item not found.', 404);
  }

  if (actor.role === 'host' && row.uploadedBy !== actor.user.id) {
    throw new MediaServiceError(
      'Forbidden: You can only delete media that you uploaded.',
      403,
    );
  }

  const usages = await findMediaUsages(row.url);
  if (usages.length > 0) {
    const noun = usages.length === 1 ? 'reference' : 'references';
    throw new MediaServiceError(
      `Cannot delete media because it is currently in use (${usages.length} ${noun}).`,
      409,
    );
  }

  const deletedRows = await db
    .delete(media)
    .where(eq(media.id, row.id))
    .returning({ id: media.id, storageKey: media.storageKey });

  if (deletedRows.length === 0) {
    throw new MediaServiceError('Media item not found.', 404);
  }

  await deleteUploadFile(row.storageKey, { uploadDir: options?.uploadDir });

  return {
    deleted: true,
    id: row.id,
    storageKey: row.storageKey,
  };
}
