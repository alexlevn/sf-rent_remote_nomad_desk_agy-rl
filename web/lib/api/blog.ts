import type { BlogPost } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists blog posts with optional category filter.
 */
export async function listBlogPosts(params?: { category?: string }): Promise<BlogPost[]> {
  const store = getMockStore();
  let result = [...store.blogPosts];

  if (params?.category) {
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
    slug: data.slug || `post-${maxId + 1}`,
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
