import { eq, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { communityVideos } from '@/lib/db/schema';
import type { CommunityVideo } from '@/lib/types';
import {
  createVideoSchema,
  updateVideoSchema,
  reorderVideosSchema,
  positiveIntIdSchema,
} from '@/lib/validations/content';

function mapVideoRow(row: typeof communityVideos.$inferSelect): CommunityVideo {
  return {
    id: row.id,
    platform: row.platform,
    url: row.videoUrl || '',
    embedSrc: row.embedUrl || '',
    aspect: row.aspect || '9:16',
    authorName: row.author || 'Guest Story',
    avatar: row.thumbnailUrl || '/seed/location/madrid.jpg',
    isActive: row.isActive,
    position: row.position,
  };
}

/**
 * Lists community reel videos from PostgreSQL. By default only returns active videos.
 */
export async function listVideos(options?: {
  includeInactive?: boolean;
}): Promise<CommunityVideo[]> {
  const query = db.select().from(communityVideos);
  const rows = options?.includeInactive
    ? await query.orderBy(asc(communityVideos.position), asc(communityVideos.id))
    : await query
        .where(eq(communityVideos.isActive, true))
        .orderBy(asc(communityVideos.position), asc(communityVideos.id));

  return rows.map(mapVideoRow);
}

/**
 * Saves or updates a video reel entry (admin CMS).
 */
export async function saveVideo(data: Partial<CommunityVideo>): Promise<CommunityVideo> {
  if (data.id !== undefined) {
    const parsed = updateVideoSchema.parse(data);
    const existing = await db
      .select()
      .from(communityVideos)
      .where(eq(communityVideos.id, parsed.id))
      .limit(1);

    if (existing.length > 0) {
      const updateValues: Partial<typeof communityVideos.$inferInsert> = {};

      if (parsed.platform !== undefined) updateValues.platform = parsed.platform;
      if (parsed.url !== undefined) updateValues.videoUrl = parsed.url;
      if (parsed.embedSrc !== undefined) updateValues.embedUrl = parsed.embedSrc;
      if (parsed.aspect !== undefined) updateValues.aspect = parsed.aspect;
      if (parsed.authorName !== undefined) {
        updateValues.author = parsed.authorName;
        updateValues.title = `Reel by ${parsed.authorName}`;
      }
      if (parsed.avatar !== undefined) updateValues.thumbnailUrl = parsed.avatar;
      if (parsed.isActive !== undefined) updateValues.isActive = parsed.isActive;
      if (parsed.position !== undefined) updateValues.position = parsed.position;

      if (Object.keys(updateValues).length === 0) {
        return mapVideoRow(existing[0]);
      }

      const [updated] = await db
        .update(communityVideos)
        .set(updateValues)
        .where(eq(communityVideos.id, parsed.id))
        .returning();

      return mapVideoRow(updated);
    }
  }

  const parsed = createVideoSchema.parse(data);

  const [maxPosRow] = await db
    .select({ maxPos: sql<number>`coalesce(max(${communityVideos.position}), 0)` })
    .from(communityVideos);
  const nextPosition = parsed.position ?? Number(maxPosRow?.maxPos ?? 0) + 1;

  const [created] = await db
    .insert(communityVideos)
    .values({
      title: `Reel by ${parsed.authorName}`,
      author: parsed.authorName,
      platform: parsed.platform,
      videoUrl: parsed.url,
      embedUrl: parsed.embedSrc,
      thumbnailUrl: parsed.avatar,
      aspect: parsed.aspect,
      isActive: parsed.isActive,
      position: nextPosition,
    })
    .returning();

  return mapVideoRow(created);
}

/**
 * Deletes a video reel by ID.
 */
export async function deleteVideo(id: number): Promise<boolean> {
  const parsedId = positiveIntIdSchema.safeParse(id);
  if (!parsedId.success) return false;

  const deleted = await db
    .delete(communityVideos)
    .where(eq(communityVideos.id, parsedId.data))
    .returning({ id: communityVideos.id });

  return deleted.length > 0;
}

/**
 * Reorders video reels by ID sequence in a single transaction.
 */
export async function reorderVideos(orderedIds: number[]): Promise<CommunityVideo[]> {
  const parsedIds = reorderVideosSchema.parse(orderedIds);

  await db.transaction(async (tx) => {
    for (let idx = 0; idx < parsedIds.length; idx++) {
      await tx
        .update(communityVideos)
        .set({ position: idx + 1 })
        .where(eq(communityVideos.id, parsedIds[idx]));
    }
  });

  return listVideos({ includeInactive: true });
}
