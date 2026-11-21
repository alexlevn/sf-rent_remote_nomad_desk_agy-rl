import type { Metadata } from 'next';
import Link from 'next/link';
import { HOW_IT_WORKS_CONTENT } from '@/content/pages/how-it-works';

export const metadata: Metadata = {
  title: 'How NomadDesk Works | Monthly Furnished Rentals',
  description:
    'Discover how NomadDesk delivers turnkey monthly stays with dual 4K workstations and verified fiber internet for remote workers.',
};

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Dark Header Banner */}
      <section className="bg-[#1a1510] text-white py-16 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[rgba(217,72,41,0.3)] mb-3">
            {HOW_IT_WORKS_CONTENT.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] lg:leading-[44px] font-bold tracking-tight text-white mb-4">
            {HOW_IT_WORKS_CONTENT.title}
          </h1>
          <p className="text-base sm:text-lg text-[#d1c8be] leading-relaxed">
            {HOW_IT_WORKS_CONTENT.subtitle}
          </p>
        </div>
      </section>

      {/* 4 Steps Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 w-full flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {HOW_IT_WORKS_CONTENT.steps.map((step) => (
            <div
              key={step.number}
              className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl font-extrabold text-[var(--color-brand)] mb-3">
                  {step.number}
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-on-light)] mb-2">
                  {step.title}
                </h2>
                <p className="text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Value Proposition Highlights */}
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-8 sm:p-10 mb-16 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)] mb-3">
              Built Specifically for Extended Remote Focus
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-on-light-muted)]">
              Traditional vacation rentals are designed for sleeping and dining. NomadDesk homes are engineered for 8 hours of uninterrupted deep work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_CONTENT.features.map((feat) => (
              <div key={feat.title} className="p-5 bg-[var(--color-bg-light)] rounded-xl border border-[var(--color-border-light)]">
                <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="text-center bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-3xl p-8 sm:p-12 shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to find your next monthly workspace?
          </h2>
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto mb-6">
            Browse verified apartments across 34 top global remote work hubs with certified desks and Gigabit internet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/a/furnished-apartments"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full text-sm font-semibold bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-all shadow-md"
            >
              Browse All Cities
            </Link>
            <Link
              href="/workstations/build"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
            >
              Configure Workstation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
