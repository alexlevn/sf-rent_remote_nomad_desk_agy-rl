import React from 'react';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { listBlogPosts } from '@/lib/api/blog';
import { BlogDirectory } from '@/features/content/blog-directory';

export const metadata: Metadata = {
  title: 'Insights for Remote Workers and Digital Nomads | NomadDesk Blog',
  description:
    'Deep dives into monthly rentals, workstation ergonomics, tax residency, and the global nomad lifestyle.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Insights for Remote Workers and Digital Nomads | NomadDesk Blog',
    description:
      'Deep dives into monthly rentals, workstation ergonomics, tax residency, and the global nomad lifestyle.',
    type: 'website',
  },
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
            <h1 className="text-2xl sm:text-4xl lg:text-[40px] lg:leading-[44px] font-bold tracking-tight text-white mb-4 leading-tight">
              Insights for Remote Workers &amp; Digital Nomads
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-on-dark-subtle)] leading-relaxed">
              Deep dives into monthly rentals, workstation ergonomics, tax residency, and the global nomad lifestyle.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BlogDirectory posts={posts} />
      </main>
    </div>
  );
}
