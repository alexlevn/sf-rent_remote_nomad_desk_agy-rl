'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { HOME_CONTENT } from '@/content/home';
import { FAQS } from '@/content/faqs';
import { SITE_CONFIG } from '@/content/site';

export function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="py-16 sm:py-20 bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] border-t border-[var(--color-border-light)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12">
          <Badge variant="accent" className="mb-2">
            {HOME_CONTENT.faq.badge}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            {HOME_CONTENT.faq.title}
          </h2>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1">
            {HOME_CONTENT.faq.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-[var(--color-border-light)] overflow-hidden transition-shadow shadow-xs hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-semibold text-[var(--color-text-on-light)] hover:text-[var(--color-brand)] transition-colors focus:outline-none"
                >
                  <span>{faq.question}</span>
                  <span
                    className={`ml-4 text-lg transform transition-transform duration-200 text-neutral-400 ${
                      isOpen ? 'rotate-180 text-[var(--color-brand)]' : ''
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed border-t border-neutral-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Center Link */}
        <div className="text-center mt-8">
          <Link
            href={SITE_CONFIG.links.faq}
            className="text-xs sm:text-sm font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
          >
            Have more questions? Visit our Help Center & FAQ →
          </Link>
        </div>
      </div>
    </section>
  );
}
