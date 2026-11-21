'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BlogPost } from '@/lib/types';

interface BlogDirectoryProps {
  posts: BlogPost[];
}

function normalizeSrc(src: string): string {
  if (!src) return '/seed/blog/blog-1.webp';
  return src.startsWith('/') ? src : `/${src}`;
}

export function BlogDirectory({ posts }: BlogDirectoryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Posts');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories, ensuring standard categories exist
  const categories = useMemo(() => {
    const defaultCats = ['Workation Tips', 'Cost Guides'];
    const catSet = new Set<string>(defaultCats);
    posts.forEach((p) => {
      if (p.category) catSet.add(p.category);
    });
    return Array.from(catSet);
  }, [posts]);

  // Filter blog posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchCategory =
        selectedCategory === 'All Posts' ||
        post.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <div className="w-full">
      {/* Category Filter Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Blog category filter">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'All Posts'}
            onClick={() => setSelectedCategory('All Posts')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
              selectedCategory === 'All Posts'
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)] shadow-sm'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] border border-[var(--color-border-light)]'
            }`}
          >
            All Posts ({posts.length})
          </button>
          {categories.map((cat) => {
            const count = posts.filter(
              (p) => p.category.toLowerCase() === cat.toLowerCase()
            ).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)] shadow-sm'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] border border-[var(--color-border-light)]'
                }`}
              >
                {cat} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Quick search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            aria-label="Search blog posts"
            className="w-full px-3 py-1.5 text-xs bg-white border border-[var(--color-border-light)] rounded-lg text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
      </div>

      {/* Blog Cards Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredPosts.map((post) => {
            const detailHref = `/blog/${post.slug}`;

            return (
              <article
                key={post.id}
                className="group flex flex-col bg-white border border-[var(--color-border-light)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-[180px] w-full overflow-hidden bg-neutral-100">
                  <Link href={detailHref} tabIndex={-1} aria-hidden="true">
                    <Image
                      src={normalizeSrc(post.image)}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-2">
                      <Badge variant="neutral" className="text-[11px]">
                        {post.category}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-[var(--color-text-on-light)] line-clamp-2 leading-snug mb-2 group-hover:text-[var(--color-brand)] transition-colors">
                      <Link href={detailHref}>{post.title}</Link>
                    </h3>

                    <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-2 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center justify-between text-xs text-[var(--color-text-on-light-muted)]">
                    <span className="font-medium text-[var(--color-text-on-light)] truncate max-w-[140px]">
                      By {post.author}
                    </span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white border border-dashed border-[var(--color-border-light)] rounded-2xl p-8 mb-16">
          <div className="text-4xl mb-3">📰</div>
          <h3 className="text-lg font-bold text-[var(--color-text-on-light)] mb-1">
            No articles found
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] max-w-md mx-auto mb-6">
            We couldn&apos;t find any articles matching &quot;{searchQuery || selectedCategory}&quot;. Try selecting another topic.
          </p>
          <Button
            variant="outline"
            size="sm"
            pill
            onClick={() => {
              setSelectedCategory('All Posts');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
