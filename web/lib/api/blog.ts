import type { BlogPost } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists blog posts with optional category, status, and draft filters.
 */
export async function listBlogPosts(params?: {
  category?: string;
  status?: string;
  includeDrafts?: boolean;
}): Promise<BlogPost[]> {
  const store = getMockStore();
  let result = [...store.blogPosts];

  if (!params?.includeDrafts && !params?.status) {
    result = result.filter((b) => b.status !== 'draft');
  } else if (params?.status && params.status !== 'all') {
    result = result.filter((b) => b.status === params.status);
  }

  if (params?.category && params.category !== 'all') {
    const q = params.category.toLowerCase();
    result = result.filter((b) => b.category.toLowerCase() === q);
  }

  return result.map((b) => ({ ...b }));
}

/**
 * Retrieves a blog post article by URL slug.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const store = getMockStore();
  const post = store.blogPosts.find((b) => b.slug === slug);
  return post ? { ...post } : null;
}

/**
 * Saves blog post changes or creates a new post (admin CMS).
 */
export async function saveBlogPost(data: Partial<BlogPost>): Promise<BlogPost> {
  const store = getMockStore();
  if (data.id) {
    const idx = store.blogPosts.findIndex((b) => b.id === data.id);
    if (idx !== -1) {
      store.blogPosts[idx] = { ...store.blogPosts[idx], ...data };
      return { ...store.blogPosts[idx] };
    }
  }

  const maxId = store.blogPosts.reduce((max, b) => Math.max(max, b.id), 0);
  const newPost: BlogPost = {
    id: maxId + 1,
    title: data.title || 'Untitled Post',
    slug:
      data.slug ||
      (data.title
        ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : `post-${maxId + 1}`),
    category: data.category || 'Remote Work',
    readTime: data.readTime || '5 min read',
    publishDate: data.publishDate || new Date().toISOString().slice(0, 10),
    author: data.author || 'NomadDesk Team',
    image: data.image || '/seed/blog/blog-nomad-gear.webp',
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: data.status || 'published',
    position: data.position ?? maxId + 1,
  };

  store.blogPosts.push(newPost);
  return { ...newPost };
}

/**
 * Deletes a blog post article by ID.
 */
export async function deleteBlogPost(id: number): Promise<boolean> {
  const store = getMockStore();
  const idx = store.blogPosts.findIndex((b) => b.id === id);
  if (idx !== -1) {
    store.blogPosts.splice(idx, 1);
    return true;
  }
  return false;
}
