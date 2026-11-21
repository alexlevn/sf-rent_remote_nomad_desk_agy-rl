import type { Metadata } from 'next';
import { listLocations } from '@/lib/api/locations';
import { DESTINATIONS_PAGE_CONTENT } from '@/content/pages/destinations';
import { DestinationsDirectory } from '@/features/destinations/destinations-directory';
import { UIStateShowcase } from '@/features/destinations/ui-state-showcase';

export const metadata: Metadata = {
  title: 'Furnished Apartments for Monthly Rentals — Global Directory | NomadDesk',
  description:
    'Explore verified monthly furnished apartments with certified fiber internet and ergonomic workstations across 34 top digital nomad destinations worldwide.',
};

export default async function DestinationsPage() {
  const locations = await listLocations();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Dark Hero Header */}
      <section className="bg-[#1a1510] text-white py-14 sm:py-16 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[rgba(217,72,41,0.3)] mb-3">
              {DESTINATIONS_PAGE_CONTENT.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              {DESTINATIONS_PAGE_CONTENT.title}
            </h1>
            <p className="text-base sm:text-lg text-[#d1c8be] leading-relaxed">
              {DESTINATIONS_PAGE_CONTENT.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main Container Directory */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <DestinationsDirectory locations={locations} />

        {/* Verification Blocks */}
        <UIStateShowcase />
      </main>
    </div>
  );
}
