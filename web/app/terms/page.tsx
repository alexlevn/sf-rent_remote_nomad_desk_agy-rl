import type { Metadata } from 'next';
import { TERMS_CONTENT } from '@/content/pages/terms';

export const metadata: Metadata = {
  title: 'Terms of Service | NomadDesk',
  description:
    'Official platform terms of service regarding 30-night minimum stays, 14-day cancellation policies, host commissions, and acceptable use.',
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-on-light)] tracking-tight mb-4">
          {TERMS_CONTENT.title}
        </h1>
        <p className="text-lg sm:text-xl text-[var(--color-text-on-light)] leading-relaxed">
          {TERMS_CONTENT.subtitle}
        </p>
      </div>

      <div className="space-y-8">
        {TERMS_CONTENT.sections.map((section) => (
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
    </main>
  );
}
