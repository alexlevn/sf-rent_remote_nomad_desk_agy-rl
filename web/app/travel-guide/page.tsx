import React from 'react';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { listTravelGuides } from '@/lib/api/guides';
import { TravelGuideDirectory } from '@/features/content/travel-guide-directory';

export const metadata: Metadata = {
  title: 'Digital Nomad Travel Guides | NomadDesk',
  description:
    'Neighborhood breakdowns, visa requirements, coworking spots, and fiber internet reliability guides curated by remote workers.',
};

export default async function TravelGuideHubPage() {
  const guides = await listTravelGuides();

  return (
    <div className="w-full">
      {/* Dark Hero Header */}
      <section className="bg-[var(--color-text-on-light)] text-white py-12 sm:py-16 mb-8 sm:mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-3">
              <Badge variant="accent">Local Intelligence</Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
              Curated Travel Guides for Remote Professionals
            </h1>
            <p className="text-sm sm:text-base text-[#d1c8be] leading-relaxed">
              Neighborhood breakdowns, visa requirements, coworking spots, and fiber internet reliability guides curated by remote workers.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TravelGuideDirectory guides={guides} />

        {/* UI States & Verification Blocks */}
        <section className="mt-12 mb-16 pt-8 border-t border-[var(--color-border-light)]">
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
            <div className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
              📋 UI States & Verification Blocks — Travel Guide Hub (/travel-guide)
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
              These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)] mb-3">
                  City Filter Pills
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                    All (8)
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                    Barcelona
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                    Lima
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)]">
                    Riga
                  </span>
                </div>
              </div>

              <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)] mb-3">
                  Editorial Verification
                </span>
                <p className="text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
                  Verified fiber connectivity check and ergonomic workspace specs indexed for digital nomads staying 30+ days.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
