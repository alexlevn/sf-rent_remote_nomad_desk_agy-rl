import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { blogPosts } from '@/lib/db/schema';
import type { BlogPost } from '@/lib/types';
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  positiveIntIdSchema,
  sanitizeHtml,
} from '@/lib/validations/content';

function mapBlogRow(row: typeof blogPosts.$inferSelect): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category || 'Remote Work',
    readTime: row.readTime || '5 min read',
    publishDate: row.createdAt.toISOString().slice(0, 10),
    author: row.author || 'NomadDesk Team',
    image: row.coverImage || '/seed/blog/blog-nomad-gear.webp',
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
 * Lists blog posts from PostgreSQL with optional category, status, and draft filters.
 * Public callers see only published posts by default.
 */
export async function listBlogPosts(params?: {
  category?: string;
  status?: string;
  includeDrafts?: boolean;
}): Promise<BlogPost[]> {
  const conditions = [];

  if (!params?.includeDrafts && !params?.status) {
    conditions.push(eq(blogPosts.status, 'published'));
  } else if (params?.status && params.status !== 'all') {
    conditions.push(eq(blogPosts.status, params.status));
  }

  if (params?.category && params.category !== 'all') {
    conditions.push(eq(sql`lower(${blogPosts.category})`, params.category.trim().toLowerCase()));
  }

  const query = db.select().from(blogPosts);
  const rows =
    conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(asc(blogPosts.position), asc(blogPosts.id))
      : await query.orderBy(asc(blogPosts.position), asc(blogPosts.id));

  return rows.map(mapBlogRow);
}

/**
 * Retrieves a blog post article by URL slug.
 * Defaults to published posts only so draft articles are not exposed on public routes.
 */
export async function getBlogPostBySlug(
  slug: string,
  options?: { includeDrafts?: boolean }
): Promise<BlogPost | null> {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const conditions = [eq(blogPosts.slug, cleanSlug)];
  if (!options?.includeDrafts) {
    conditions.push(eq(blogPosts.status, 'published'));
  }

  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .limit(1);

  return rows.length > 0 ? mapBlogRow(rows[0]) : null;
}

/**
 * Saves blog post changes or creates a new post (admin CMS).
 */
export async function saveBlogPost(data: Partial<BlogPost>): Promise<BlogPost> {
  if (data.id !== undefined) {
    const parsed = updateBlogPostSchema.parse(data);
    const existing = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, parsed.id))
      .limit(1);

    if (existing.length > 0) {
      const updateValues: Partial<typeof blogPosts.$inferInsert> = {};

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
      if (parsed.category !== undefined) updateValues.category = parsed.category;
      if (parsed.readTime !== undefined) updateValues.readTime = parsed.readTime;
      if (parsed.author !== undefined) updateValues.author = parsed.author;
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
        return mapBlogRow(existing[0]);
      }

      const [updated] = await db
        .update(blogPosts)
        .set(updateValues)
        .where(eq(blogPosts.id, parsed.id))
        .returning();

      return mapBlogRow(updated);
    }
  }

  const parsed = createBlogPostSchema.parse({
    ...data,
    title: data.title || 'Untitled Post',
  });

  const [maxPosRow] = await db
    .select({ maxPos: sql<number>`coalesce(max(${blogPosts.position}), 0)` })
    .from(blogPosts);
  const nextPosition = parsed.position ?? Number(maxPosRow?.maxPos ?? 0) + 1;

  const baseSlug = parsed.slug || slugify(parsed.title) || `post-${nextPosition}`;
  const sanitizedContent = sanitizeHtml(parsed.content);
  const createdAt = parsePublishDate(parsed.publishDate) ?? new Date();

  const [created] = await db
    .insert(blogPosts)
    .values({
      slug: baseSlug,
      title: parsed.title,
      category: parsed.category,
      readTime: parsed.readTime,
      author: parsed.author,
      coverImage: parsed.image,
      excerpt: parsed.excerpt,
      content: sanitizedContent,
      status: parsed.status,
      seoTitle: parsed.seoTitle || parsed.title,
      seoDescription: parsed.seoDescription || parsed.excerpt,
      position: nextPosition,
      createdAt,
    })
    .returning();

  return mapBlogRow(created);
}

/**
 * Deletes a blog post article by ID.
 */
export async function deleteBlogPost(id: number): Promise<boolean> {
  const parsedId = positiveIntIdSchema.safeParse(id);
  if (!parsedId.success) return false;

  const deleted = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, parsedId.data))
    .returning({ id: blogPosts.id });

  return deleted.length > 0;
}
