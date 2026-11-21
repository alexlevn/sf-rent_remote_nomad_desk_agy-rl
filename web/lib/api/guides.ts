import type { TravelGuide } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists travel guides with optional city and featured filters.
 */
export async function listTravelGuides(params?: {
  city?: string;
  featured?: boolean;
}): Promise<TravelGuide[]> {
  const store = getMockStore();
  let result = [...store.guides];

  if (params?.city) {
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
    slug: data.slug || `guide-${maxId + 1}`,
    city: data.city || 'Barcelona',
    category: data.category || 'City Guide',
    publishDate: data.publishDate || new Date().toISOString().slice(0, 10),
    featured: data.featured ?? false,
    image: data.image || '/seed/guide/guide-barcelona.webp',
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: data.status || 'published',
    position: data.position ?? maxId + 1,
  };

  store.guides.push(newGuide);
  return { ...newGuide };
}
