'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TravelGuide } from '@/lib/types';

interface TravelGuideDirectoryProps {
  guides: TravelGuide[];
}

function normalizeSrc(src: string): string {
  if (!src || src.includes('placeholder')) return '/seed/guide/362.webp';
  return src.startsWith('/') ? src : `/${src}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-');
}

export function TravelGuideDirectory({ guides }: TravelGuideDirectoryProps) {
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique cities
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    guides.forEach((g) => {
      if (g.city) citySet.add(g.city);
    });
    return Array.from(citySet).sort();
  }, [guides]);

  // Filter guides
  const filteredGuides = useMemo(() => {
    return guides.filter((guide) => {
      const matchCity =
        selectedCity === 'All' || guide.city.toLowerCase() === selectedCity.toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCity && matchQuery;
    });
  }, [guides, selectedCity, searchQuery]);

  return (
    <div className="w-full">
      {/* City Filters Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="City filter">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCity === 'All'}
            onClick={() => setSelectedCity('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
              selectedCity === 'All'
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)] shadow-sm'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] border border-[var(--color-border-light)]'
            }`}
          >
            All ({guides.length})
          </button>
          {cities.map((city) => {
            const count = guides.filter((g) => g.city.toLowerCase() === city.toLowerCase()).length;
            const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)] shadow-sm'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] border border-[var(--color-border-light)]'
                }`}
              >
                {city} ({count})
              </button>
            );
          })}
        </div>

        {/* Optional quick search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides..."
            aria-label="Search travel guides"
            className="w-full px-3 py-1.5 text-xs bg-white border border-[var(--color-border-light)] rounded-lg text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
      </div>

      {/* Guide Cards Grid */}
      {filteredGuides.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredGuides.map((guide) => {
            const detailHref = `/travel-guide/${slugify(guide.city)}/${slugify(guide.category)}/${guide.slug}`;

            return (
              <article
                key={guide.id}
                className="group flex flex-col bg-white border border-[var(--color-border-light)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-[180px] w-full overflow-hidden bg-neutral-100">
                  <Link href={detailHref} tabIndex={-1} aria-hidden="true">
                    <Image
                      src={normalizeSrc(guide.image)}
                      alt={guide.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-2">
                      <Badge variant="accent" className="text-[11px]">
                        {guide.city} · {guide.category}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-[var(--color-text-on-light)] line-clamp-2 leading-snug mb-2 group-hover:text-[var(--color-brand)] transition-colors">
                      <Link href={detailHref}>{guide.title}</Link>
                    </h3>

                    <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-2 leading-relaxed mb-4">
                      {guide.excerpt}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border-light)] flex items-center justify-between">
                    <Link
                      href={detailHref}
                      className="text-xs font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
                    >
                      Read Full Guide →
                    </Link>
                    <span className="text-[11px] text-[var(--color-text-light-subtle)]">
                      {guide.publishDate}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white border border-dashed border-[var(--color-border-light)] rounded-2xl p-8 mb-16">
          <div className="text-4xl mb-3">🧭</div>
          <h3 className="text-lg font-bold text-[var(--color-text-on-light)] mb-1">
            No travel guides found
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] max-w-md mx-auto mb-6">
            We couldn&apos;t find any guides matching &quot;{searchQuery || selectedCity}&quot;. Try resetting your filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            pill
            onClick={() => {
              setSelectedCity('All');
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
