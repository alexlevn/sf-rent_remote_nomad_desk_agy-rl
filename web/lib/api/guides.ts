import type { TravelGuide } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists travel guides with optional city, featured, and status filters.
 */
export async function listTravelGuides(params?: {
  city?: string;
  featured?: boolean;
  status?: string;
  includeDrafts?: boolean;
}): Promise<TravelGuide[]> {
  const store = getMockStore();
  let result = [...store.guides];

  if (!params?.includeDrafts && !params?.status) {
    result = result.filter((g) => g.status !== 'draft');
  } else if (params?.status && params.status !== 'all') {
    result = result.filter((g) => g.status === params.status);
  }

  if (params?.city && params.city !== 'all') {
    const q = params.city.toLowerCase();
    result = result.filter((g) => g.city.toLowerCase() === q);
  }

  if (params?.featured != null) {
    result = result.filter((g) => g.featured === params.featured);
  }

  return result.map((g) => ({ ...g }));
}

/**
 * Retrieves a travel guide article by URL slug.
 */
export async function getTravelGuideBySlug(slug: string): Promise<TravelGuide | null> {
  const store = getMockStore();
  const guide = store.guides.find((g) => g.slug === slug);
  return guide ? { ...guide } : null;
}

/**
 * Saves travel guide changes or creates a new article (admin CMS).
 */
export async function saveTravelGuide(data: Partial<TravelGuide>): Promise<TravelGuide> {
  const store = getMockStore();
  if (data.id) {
    const idx = store.guides.findIndex((g) => g.id === data.id);
    if (idx !== -1) {
      store.guides[idx] = { ...store.guides[idx], ...data };
      return { ...store.guides[idx] };
    }
  }

  const maxId = store.guides.reduce((max, g) => Math.max(max, g.id), 0);
  const newGuide: TravelGuide = {
    id: maxId + 1,
    title: data.title || 'Untitled Guide',
    slug:
      data.slug ||
      (data.title
        ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : `guide-${maxId + 1}`),
    city: data.city || 'Barcelona',
    category: data.category || 'City Guide',
    publishDate: data.publishDate || new Date().toISOString().slice(0, 10),
    featured: data.featured ?? false,
    image: data.image || '/seed/guide/placeholder.webp',
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: data.status || 'published',
    position: data.position ?? maxId + 1,
  };

  store.guides.push(newGuide);
  return { ...newGuide };
}

/**
 * Deletes a travel guide article by ID.
 */
export async function deleteTravelGuide(id: number): Promise<boolean> {
  const store = getMockStore();
  const idx = store.guides.findIndex((g) => g.id === id);
  if (idx !== -1) {
    store.guides.splice(idx, 1);
    return true;
  }
  return false;
}
