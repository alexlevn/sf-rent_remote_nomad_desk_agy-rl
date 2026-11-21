export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
}

export interface TravelGuide {
  id: number;
  title: string;
  slug: string;
  city: string;
  category: string;
  publishDate: string;
  featured: boolean;
  image: string;
  excerpt: string;
  content: string;
  status?: 'draft' | 'published';
  position?: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  publishDate: string;
  author: string;
  image: string;
  excerpt: string;
  content: string;
  status?: 'draft' | 'published';
  position?: number;
}

export interface CommunityVideo {
  id: number;
  platform: string;
  url: string;
  embedSrc: string;
  aspect: string;
  authorName: string;
  avatar: string;
  isActive?: boolean;
  position?: number;
}
