import { z } from 'zod';

const INT4_MAX = 2_147_483_647;

export const contentStatusSchema = z.enum(['draft', 'published']);

export const positiveIntIdSchema = z.number().int().positive().max(INT4_MAX);

const YOUTUBE_EMBED_SRC_RE =
  /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/[A-Za-z0-9_-]{6,}(?:\?[A-Za-z0-9_=&%.-]*)?$/;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeYoutubeIframe(rawAttrs: string): string {
  const attrs = new Map<string, string>();
  const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs.set(name, val);
  }

  const src = (attrs.get('src') ?? '').trim();
  if (!YOUTUBE_EMBED_SRC_RE.test(src)) {
    return '';
  }

  const parts: string[] = [`src="${escapeHtmlAttr(src)}"`];

  const width = (attrs.get('width') ?? '').trim();
  if (/^\d+%?$/.test(width)) {
    parts.push(`width="${width}"`);
  }

  const height = (attrs.get('height') ?? '').trim();
  if (/^\d+%?$/.test(height)) {
    parts.push(`height="${height}"`);
  }

  const frameborder = (attrs.get('frameborder') ?? '').trim();
  if (/^\d+$/.test(frameborder)) {
    parts.push(`frameborder="${frameborder}"`);
  }

  const title = (attrs.get('title') ?? '').trim();
  if (title) {
    parts.push(`title="${escapeHtmlAttr(title)}"`);
  }

  const allow = (attrs.get('allow') ?? '').trim();
  if (allow && /^[A-Za-z0-9;\s_-]+$/.test(allow)) {
    parts.push(`allow="${allow}"`);
  }

  if (attrs.has('allowfullscreen')) {
    const val = (attrs.get('allowfullscreen') ?? '').trim().toLowerCase();
    if (val === '' || val === 'true' || val === 'allowfullscreen') {
      parts.push('allowfullscreen');
    }
  }

  return `<iframe ${parts.join(' ')}></iframe>`;
}

/**
 * Sanitizes rich HTML content to prevent XSS while preserving benign formatting tags
 * and allowlisted YouTube embed iframes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Placeholder tokens protect allowlisted YouTube iframes from the fallback iframe strip
  const preservedIframes: string[] = [];
  const keepIframe = (rawAttrs: string): string => {
    const safe = sanitizeYoutubeIframe(rawAttrs);
    if (!safe) return '';
    const idx = preservedIframes.push(safe) - 1;
    return `<!--__SAFE_YT_IFRAME_${idx}__-->`;
  };

  let cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?script\b[^>]*>/gi, '')
    .replace(/<(object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(object|embed)\b[^>]*>/gi, '')
    .replace(/<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi, (_full, attrs: string) => keepIframe(attrs))
    .replace(/<iframe\b([^>]*)\/?>/gi, (_full, attrs: string) => keepIframe(attrs))
    .replace(/<\/iframe\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '');

  for (let i = 0; i < preservedIframes.length; i += 1) {
    cleaned = cleaned.replace(`<!--__SAFE_YT_IFRAME_${i}__-->`, preservedIframes[i]);
  }

  return cleaned;
}

/**
 * Checks whether a string contains HTML tags (avoids false positives on plain text like "10 < 20").
 */
export function hasHtmlTags(value: string): boolean {
  if (!value) return false;
  return /<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?>/i.test(value);
}

/**
 * Strips HTML tags and decodes common entities for plain-text metadata descriptions.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Zod schema for creating a new TravelGuide.
 */
export const createTravelGuideSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  slug: z.string().trim().min(1).max(150).optional(),
  city: z.string().trim().min(1).max(100).optional().default('Barcelona'),
  category: z.string().trim().min(1).max(100).optional().default('City Guide'),
  publishDate: z.string().trim().max(50).optional(),
  featured: z.boolean().optional().default(false),
  image: z.string().trim().max(255).optional().default('/seed/guide/placeholder.webp'),
  excerpt: z.string().optional().default(''),
  content: z.string().optional().default(''),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  status: contentStatusSchema.optional().default('published'),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for updating an existing TravelGuide (no defaults applied).
 */
export const updateTravelGuideSchema = z.object({
  id: positiveIntIdSchema,
  title: z.string().trim().min(1, 'Title cannot be empty').max(255).optional(),
  slug: z.string().trim().min(1, 'Slug cannot be empty').max(150).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  publishDate: z.string().trim().max(50).optional(),
  featured: z.boolean().optional(),
  image: z.string().trim().max(255).optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  status: contentStatusSchema.optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for creating a new BlogPost.
 */
export const createBlogPostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  slug: z.string().trim().min(1).max(150).optional(),
  category: z.string().trim().min(1).max(100).optional().default('Remote Work'),
  readTime: z.string().trim().min(1).max(50).optional().default('5 min read'),
  publishDate: z.string().trim().max(50).optional(),
  author: z.string().trim().min(1).max(100).optional().default('NomadDesk Team'),
  image: z.string().trim().max(255).optional().default('/seed/blog/blog-nomad-gear.webp'),
  excerpt: z.string().optional().default(''),
  content: z.string().optional().default(''),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  status: contentStatusSchema.optional().default('published'),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for updating an existing BlogPost (no defaults applied).
 */
export const updateBlogPostSchema = z.object({
  id: positiveIntIdSchema,
  title: z.string().trim().min(1, 'Title cannot be empty').max(255).optional(),
  slug: z.string().trim().min(1, 'Slug cannot be empty').max(150).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  readTime: z.string().trim().min(1).max(50).optional(),
  publishDate: z.string().trim().max(50).optional(),
  author: z.string().trim().min(1).max(100).optional(),
  image: z.string().trim().max(255).optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  seoTitle: z.string().trim().max(255).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  status: contentStatusSchema.optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for creating a new CommunityVideo.
 */
export const createVideoSchema = z.object({
  platform: z.string().trim().min(1).max(50).optional().default('Instagram'),
  url: z.string().trim().max(255).optional().default('https://www.instagram.com'),
  embedSrc: z.string().trim().max(255).optional().default(''),
  aspect: z.string().trim().max(20).optional().default('9:16'),
  authorName: z.string().trim().min(1).max(100).optional().default('Guest Story'),
  avatar: z.string().trim().max(255).optional().default('/seed/location/madrid.jpg'),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for updating an existing CommunityVideo (no defaults applied).
 */
export const updateVideoSchema = z.object({
  id: positiveIntIdSchema,
  platform: z.string().trim().min(1).max(50).optional(),
  url: z.string().trim().max(255).optional(),
  embedSrc: z.string().trim().max(255).optional(),
  aspect: z.string().trim().max(20).optional(),
  authorName: z.string().trim().min(1).max(100).optional(),
  avatar: z.string().trim().max(255).optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for reordering CommunityVideos by ID array.
 */
export const reorderVideosSchema = z.array(positiveIntIdSchema);

/**
 * Zod schema for validating stored ExchangeRates JSONB payload.
 */
export const exchangeRatesSchema = z.object({
  EUR_USD: z.number().finite().positive().max(1000),
  GBP_USD: z.number().finite().positive().max(1000),
  USD_USD: z.literal(1.0).optional().default(1.0),
});

/**
 * Zod schema for updating ExchangeRates (no defaults applied).
 */
export const updateExchangeRatesSchema = z.object({
  EUR_USD: z.number().finite().positive().max(1000).optional(),
  GBP_USD: z.number().finite().positive().max(1000).optional(),
  USD_USD: z.literal(1.0).optional(),
});

export type CreateTravelGuideInput = z.infer<typeof createTravelGuideSchema>;
export type UpdateTravelGuideInput = z.infer<typeof updateTravelGuideSchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type UpdateExchangeRatesInput = z.infer<typeof updateExchangeRatesSchema>;
