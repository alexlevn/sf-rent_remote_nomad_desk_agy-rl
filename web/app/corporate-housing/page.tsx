import type { Metadata } from 'next';
import Link from 'next/link';
import { CORPORATE_HOUSING_CONTENT } from '@/content/pages/corporate-housing';

export const metadata: Metadata = {
  title: 'Corporate Housing | NomadDesk',
  description:
    'Furnished apartments with certified workstations for relocating remote teams, engineering offsites, and project-based assignments.',
};

export default function CorporateHousingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-[36px] font-bold text-[var(--color-text-on-light)] tracking-tight mb-4">
          {CORPORATE_HOUSING_CONTENT.title}
        </h1>
        <p className="text-lg sm:text-xl text-[var(--color-text-on-light)] leading-relaxed">
          {CORPORATE_HOUSING_CONTENT.subtitle}
        </p>
      </div>

      <div className="space-y-8 mb-12">
        {CORPORATE_HOUSING_CONTENT.sections.map((section) => (
          <div
            key={section.title}
            className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8 shadow-2xs"
          >
            <h2 className="text-xl font-bold text-[var(--color-text-on-light)] mb-3">
              {section.title}
            </h2>
            <p className="text-base text-[var(--color-text-on-light-muted)] leading-relaxed">
              {section.body}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <Link
          href={CORPORATE_HOUSING_CONTENT.ctaHref}
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full text-sm font-semibold bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-all shadow-sm"
        >
          {CORPORATE_HOUSING_CONTENT.ctaText} →
        </Link>
      </div>
    </main>
  );
}
