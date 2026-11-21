import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { DEFAULT_EXCHANGE_RATES } from '@/lib/pricing';
import { sanitizeHtml } from '@/lib/validations/content';
import {
  listTravelGuides,
  getTravelGuideBySlug,
  saveTravelGuide,
  deleteTravelGuide,
} from './guides';
import {
  listBlogPosts,
  getBlogPostBySlug,
  saveBlogPost,
  deleteBlogPost,
} from './blog';
import {
  listVideos,
  saveVideo,
  deleteVideo,
  reorderVideos,
} from './videos';
import {
  getExchangeRates,
  updateExchangeRates,
} from './rates';

describe('Content & Exchange Rates DB API Suite (T7)', () => {
  describe('sanitizeHtml', () => {
    it('strips dangerous script tags, event handlers, and javascript URIs', () => {
      const payload =
        '<h2>Clean</h2><p>Safe</p><script>alert("xss")</script><img src="x.jpg" onerror="alert(1)" /><a href="javascript:alert(2)">link</a>';
      const cleaned = sanitizeHtml(payload);

      expect(cleaned).toContain('<h2>Clean</h2>');
      expect(cleaned).toContain('<p>Safe</p>');
      expect(cleaned).not.toMatch(/<script/i);
      expect(cleaned).not.toMatch(/onerror/i);
      expect(cleaned).not.toMatch(/javascript:/i);
    });

    it('preserves benign rich HTML verbatim', () => {
      const benign =
        '<h2>Cost of Living</h2><p>Lisbon offers <strong>great</strong> fiber.</p><ul><li>300 Mbps</li></ul><a href="https://nomaddesk.com">Read more</a>';
      expect(sanitizeHtml(benign)).toBe(benign);
    });
  });

  describe('Travel Guides API', () => {
    it('lists seeded published guides and filters by city and featured', async () => {
      const all = await listTravelGuides();
      expect(all.length).toBeGreaterThanOrEqual(8);
      expect(all.every((g) => g.status === 'published')).toBe(true);

      const nonFeatured = await listTravelGuides({ featured: false });
      expect(nonFeatured.length).toBeGreaterThan(0);
      expect(nonFeatured.every((g) => g.featured === false)).toBe(true);

      const city = all[0].city;
      const byCity = await listTravelGuides({ city: city.toLowerCase() });
      expect(byCity.length).toBeGreaterThan(0);
      expect(byCity.every((g) => g.city.toLowerCase() === city.toLowerCase())).toBe(true);
    });

    it('creates, sanitizes XSS, hides drafts from public queries, updates, and deletes a guide', async () => {
      const slug = `unit-test-guide-${Date.now()}`;
      let createdId: number | null = null;

      try {
        const created = await saveTravelGuide({
          title: 'Unit Test Draft Guide',
          slug,
          city: 'Lisbon',
          category: 'Coworking',
          featured: false,
          status: 'draft',
          excerpt: 'Draft excerpt',
          content: '<p>Hello</p><script>alert("x")</script><img src="a.jpg" onerror="evil()" />',
        });
        createdId = created.id;

        expect(created.slug).toBe(slug);
        expect(created.status).toBe('draft');
        expect(created.content).not.toMatch(/<script/i);
        expect(created.content).not.toMatch(/onerror/i);

        // Public queries must hide drafts
        const publicList = await listTravelGuides();
        expect(publicList.find((g) => g.id === created.id)).toBeUndefined();
        expect(await getTravelGuideBySlug(slug)).toBeNull();

        // Admin / includeDrafts queries return draft
        const adminList = await listTravelGuides({ includeDrafts: true });
        expect(adminList.find((g) => g.id === created.id)).toBeDefined();
        const draftBySlug = await getTravelGuideBySlug(slug, { includeDrafts: true });
        expect(draftBySlug?.id).toBe(created.id);

        // Publish and verify public visibility
        const updated = await saveTravelGuide({
          id: created.id,
          status: 'published',
          featured: true,
        });
        expect(updated.status).toBe('published');
        expect(updated.featured).toBe(true);
        expect(updated.title).toBe('Unit Test Draft Guide');

        const publicBySlug = await getTravelGuideBySlug(slug);
        expect(publicBySlug?.id).toBe(created.id);

        const featuredList = await listTravelGuides({ featured: true });
        expect(featuredList.some((g) => g.id === created.id)).toBe(true);
      } finally {
        if (createdId !== null) {
          const deleted = await deleteTravelGuide(createdId);
          expect(deleted).toBe(true);
        }
      }
    });
  });

  describe('Blog Posts API', () => {
    it('lists seeded published blog posts and retrieves by slug', async () => {
      const posts = await listBlogPosts();
      expect(posts.length).toBeGreaterThanOrEqual(2);
      expect(posts.every((p) => p.status === 'published')).toBe(true);

      const first = await getBlogPostBySlug(posts[0].slug);
      expect(first?.id).toBe(posts[0].id);
      expect(await getBlogPostBySlug('non-existent-blog-slug')).toBeNull();
    });

    it('creates, sanitizes, updates, filters drafts, and deletes a blog post', async () => {
      const slug = `unit-test-post-${Date.now()}`;
      let createdId: number | null = null;

      try {
        const created = await saveBlogPost({
          title: 'Unit Test Blog Post',
          slug,
          category: 'Cost Guides',
          author: 'QA Bot',
          status: 'draft',
          content: '<p>Safe text</p><script>bad()</script>',
        });
        createdId = created.id;

        expect(created.slug).toBe(slug);
        expect(created.content).toBe('<p>Safe text</p>');
        expect(await getBlogPostBySlug(slug)).toBeNull();

        const published = await saveBlogPost({
          id: created.id,
          status: 'published',
        });
        expect(published.status).toBe('published');
        expect((await getBlogPostBySlug(slug))?.id).toBe(created.id);

        const byCategory = await listBlogPosts({ category: 'cost guides' });
        expect(byCategory.some((p) => p.id === created.id)).toBe(true);
      } finally {
        if (createdId !== null) {
          const deleted = await deleteBlogPost(createdId);
          expect(deleted).toBe(true);
        }
      }
    });
  });

  describe('Community Videos API', () => {
    it('lists seeded active videos, creates, updates, reorders, and deletes cleanly', async () => {
      const initial = await listVideos();
      expect(initial.length).toBeGreaterThanOrEqual(7);
      const originalOrder = initial.map((v) => v.id);

      let createdId: number | null = null;
      try {
        const created = await saveVideo({
          platform: 'Instagram',
          authorName: 'Unit Test Nomad',
          url: 'https://www.instagram.com/reel/test',
          isActive: false,
        });
        createdId = created.id;

        // Inactive video excluded from default list
        const activeOnly = await listVideos();
        expect(activeOnly.find((v) => v.id === created.id)).toBeUndefined();

        const withInactive = await listVideos({ includeInactive: true });
        expect(withInactive.find((v) => v.id === created.id)).toBeDefined();

        // Activate and reorder
        const activated = await saveVideo({ id: created.id, isActive: true });
        expect(activated.isActive).toBe(true);

        const reordered = await reorderVideos([created.id, ...originalOrder]);
        expect(reordered[0].id).toBe(created.id);
        expect(reordered[0].position).toBe(1);
      } finally {
        if (createdId !== null) {
          const deleted = await deleteVideo(createdId);
          expect(deleted).toBe(true);
        }
        await reorderVideos(originalOrder);
      }
    });
  });

  describe('Exchange Rates API', () => {
    it('reads seeded rates, updates EUR_USD in DB, and restores cleanly', async () => {
      const original = await getExchangeRates();
      expect(original.USD_USD).toBe(1.0);
      expect(original.EUR_USD).toBeGreaterThan(0);
      expect(original.GBP_USD).toBeGreaterThan(0);

      try {
        const updated = await updateExchangeRates({ EUR_USD: 1.45 });
        expect(updated.EUR_USD).toBe(1.45);
        expect(updated.GBP_USD).toBe(original.GBP_USD);
        expect(updated.USD_USD).toBe(1.0);

        const fetched = await getExchangeRates();
        expect(fetched.EUR_USD).toBe(1.45);
      } finally {
        await updateExchangeRates(original);
      }
    });

    it('falls back safely to DEFAULT_EXCHANGE_RATES when settings JSONB is corrupted', async () => {
      const original = await getExchangeRates();
      try {
        await db
          .update(settings)
          .set({ value: { corrupted: true } })
          .where(eq(settings.key, 'currency_rates'));

        const fallback = await getExchangeRates();
        expect(fallback).toEqual(DEFAULT_EXCHANGE_RATES);
      } finally {
        await updateExchangeRates(original);
      }
    });

    it('rejects non-positive exchange rates via Zod validation', async () => {
      await expect(updateExchangeRates({ EUR_USD: -1 })).rejects.toThrow();
      await expect(updateExchangeRates({ GBP_USD: 0 })).rejects.toThrow();
    });
  });
});
