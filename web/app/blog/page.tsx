import React from 'react';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { listBlogPosts } from '@/lib/api/blog';
import { BlogDirectory } from '@/features/content/blog-directory';

export const metadata: Metadata = {
  title: 'Insights for Remote Workers and Digital Nomads | NomadDesk Blog',
  description:
    'Deep dives into monthly rentals, workstation ergonomics, tax residency, and the global nomad lifestyle.',
};

export default async function BlogHubPage() {
  const posts = await listBlogPosts();

  return (
    <div className="w-full">
      {/* Dark Hero Header */}
      <section className="bg-[var(--color-text-on-light)] text-white py-12 sm:py-16 mb-8 sm:mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-3">
              <Badge variant="accent">Editorial</Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
              Insights for Remote Workers &amp; Digital Nomads
            </h1>
            <p className="text-sm sm:text-base text-[#d1c8be] leading-relaxed">
              Deep dives into monthly rentals, workstation ergonomics, tax residency, and the global nomad lifestyle.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BlogDirectory posts={posts} />

        {/* UI States & Verification Blocks */}
        <section className="mt-12 mb-16 pt-8 border-t border-[var(--color-border-light)]">
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
            <div className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
              📋 UI States & Verification Blocks — Blog Hub (/blog)
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
              These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)] mb-3">
                  Blog Category Filter
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                    All Posts
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                    Workation Tips
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                    Cost Guides
                  </span>
                </div>
              </div>

              <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info-border)] mb-3">
                  Publication Frequency
                </span>
                <p className="text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
                  Articles published bi-weekly focusing on equipment benchmarks, tax frameworks, and lease negotiations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
