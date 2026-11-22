import React from 'react';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { listTravelGuides } from '@/lib/api/guides';
import { TravelGuideDirectory } from '@/features/content/travel-guide-directory';

export const metadata: Metadata = {
  title: 'Digital Nomad Travel Guides | NomadDesk',
  description:
    'Neighborhood breakdowns, visa requirements, coworking spots, and fiber internet reliability guides curated by remote workers.',
  alternates: {
    canonical: '/travel-guide',
  },
  openGraph: {
    title: 'Digital Nomad Travel Guides | NomadDesk',
    description:
      'Neighborhood breakdowns, visa requirements, coworking spots, and fiber internet reliability guides curated by remote workers.',
    type: 'website',
  },
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
            <h1 className="text-2xl sm:text-4xl lg:text-[40px] lg:leading-[44px] font-bold tracking-tight text-white mb-4 leading-tight">
              Curated Travel Guides for Remote Professionals
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-on-dark-subtle)] leading-relaxed">
              Neighborhood breakdowns, visa requirements, coworking spots, and fiber internet reliability guides curated by remote workers.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TravelGuideDirectory guides={guides} />
      </main>
    </div>
  );
}
