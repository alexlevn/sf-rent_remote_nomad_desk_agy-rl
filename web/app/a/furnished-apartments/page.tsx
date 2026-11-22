import type { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';
import { listLocations } from '@/lib/api/locations';
import { DESTINATIONS_PAGE_CONTENT } from '@/content/pages/destinations';
import { DestinationsDirectory } from '@/features/destinations/destinations-directory';

export const metadata: Metadata = {
  title: 'Furnished Apartments for Monthly Rentals — Global Directory | NomadDesk',
  description:
    'Explore verified monthly furnished apartments with certified fiber internet and ergonomic workstations across top digital nomad destinations worldwide.',
  alternates: {
    canonical: '/a/furnished-apartments',
  },
  openGraph: {
    title: 'Furnished Apartments for Monthly Rentals — Global Directory | NomadDesk',
    description:
      'Explore verified monthly furnished apartments with certified fiber internet and ergonomic workstations worldwide.',
    type: 'website',
  },
};

export default async function DestinationsPage() {
  const locations = await listLocations();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Dark Hero Header */}
      <section className="bg-[var(--color-bg-dark-hero)] text-white py-14 sm:py-16 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[color-mix(in_srgb,var(--color-brand)_30%,transparent)] mb-3">
              {DESTINATIONS_PAGE_CONTENT.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] lg:leading-[44px] font-bold tracking-tight text-white mb-4">
              {DESTINATIONS_PAGE_CONTENT.title}
            </h1>
            <p className="text-base sm:text-lg text-[var(--color-text-on-dark-subtle)] leading-relaxed">
              {DESTINATIONS_PAGE_CONTENT.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main Container Directory */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 pb-16">
        <DestinationsDirectory locations={locations} />

        {/* Destinations FAQ Accordion */}
        <section className="mt-14 pt-10 border-t border-[var(--color-border-light)] max-w-4xl">
          <h2 className="text-2xl font-bold text-[var(--color-text-on-light)] mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mb-6">
            Key details about monthly stays across our global destination directory.
          </p>
          <div className="space-y-3">
            {DESTINATIONS_PAGE_CONTENT.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-[var(--color-border-light)] rounded-xl p-5 open:border-[var(--color-brand)] transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-sm text-[var(--color-text-on-light)]">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-on-light-muted)] group-open:rotate-180 transition-transform shrink-0 ml-4" />
                </summary>
                <p className="mt-3 pt-3 border-t border-[var(--color-border-light)] text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
