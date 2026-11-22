import type { Metadata } from 'next';
import { BOOKING_RULES } from '@/content/booking-rules';
import { FAQ_PAGE_CONTENT } from '@/content/pages/faq';
import { FAQAccordion } from '@/features/faq/faq-accordion';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | NomadDesk',
  description: `Answers regarding ${BOOKING_RULES.minimumStayNights}-night minimum stays, ergonomic workstation tiers, payment authorization, and flexible ${BOOKING_RULES.freeCancelDays}-day cancellation policies.`,
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions | NomadDesk',
    description: `Answers regarding ${BOOKING_RULES.minimumStayNights}-night minimum stays, ergonomic workstation tiers, payment authorization, and flexible ${BOOKING_RULES.freeCancelDays}-day cancellation policies.`,
    type: 'website',
  },
};

export default function FAQPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-[36px] font-bold text-[var(--color-text-on-light)] tracking-tight mb-3">
          {FAQ_PAGE_CONTENT.title}
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-text-on-light-muted)] max-w-2xl mx-auto">
          {FAQ_PAGE_CONTENT.subtitle}
        </p>
      </div>

      <FAQAccordion />
    </main>
  );
}
