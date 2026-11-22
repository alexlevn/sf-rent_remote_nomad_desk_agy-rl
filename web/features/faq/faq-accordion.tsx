'use client';

import { useState } from 'react';
import { FAQ_PAGE_CONTENT, type FAQPageItem } from '@/content/pages/faq';
import { cn } from '@/lib/utils';

export function FAQAccordion() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(['faq-min-stay', 'faq-workstation'])
  );

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredItems = FAQ_PAGE_CONTENT.items.filter((item: FAQPageItem) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {FAQ_PAGE_CONTENT.categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all',
              selectedCategory === category
                ? 'bg-[var(--color-brand)] text-white shadow-xs'
                : 'bg-white border border-[var(--color-border-light)] text-[var(--color-text-on-light-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Accordion items */}
      <div className="space-y-4">
        {filteredItems.map((item: FAQPageItem) => {
          const isOpen = openIds.has(item.id);
          return (
            <div
              key={item.id}
              className="bg-white border border-[var(--color-border-light)] rounded-2xl overflow-hidden transition-all shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${item.id}`}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-[var(--color-bg-light)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-on-light-muted)]">
                    {item.category}
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-[var(--color-text-on-light)]">
                    {item.question}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-lg text-[var(--color-brand)] font-bold transition-transform duration-200 shrink-0',
                    isOpen ? 'rotate-180' : '',
                  )}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${item.id}`}
                  className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-[var(--color-text-on-light-muted)] leading-relaxed border-t border-[var(--color-surface-muted)]"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
