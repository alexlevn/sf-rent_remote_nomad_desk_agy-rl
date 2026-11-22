'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
  itemLabel?: string;
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (windowStart > 2) {
    pages.push('ellipsis');
  }

  for (let p = windowStart; p <= windowEnd; p += 1) {
    pages.push(p);
  }

  if (windowEnd < totalPages - 1) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);
  return pages;
}

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  itemLabel = 'items',
}: PaginationBarProps) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * safePageSize, total);
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  return (
    <div
      data-testid="pagination-bar"
      className="px-4 py-3 border-t border-[var(--color-border-light)] bg-neutral-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
    >
      <div data-testid="pagination-summary" className="text-[var(--color-text-on-light-muted)]">
        {total === 0 ? (
          <span>Showing 0 of 0 {itemLabel}</span>
        ) : (
          <span>
            Showing{' '}
            <strong className="text-[var(--color-text-on-light)]">
              {start}–{end}
            </strong>{' '}
            of <strong className="text-[var(--color-text-on-light)]">{total}</strong> {itemLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          data-testid="pagination-prev"
          onClick={() => onPageChange(safePage - 1)}
          disabled={disabled || safePage <= 1}
          aria-label="Previous page"
          className="inline-flex min-h-10 sm:min-h-8 items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((entry, idx) =>
            entry === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-neutral-400 select-none"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                disabled={disabled || entry === safePage}
                aria-label={`Page ${entry}`}
                aria-current={entry === safePage ? 'page' : undefined}
                className={cn(
                  'min-h-10 sm:min-h-8 min-w-10 sm:min-w-8 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer',
                  entry === safePage
                    ? 'bg-[var(--color-brand)] text-white shadow-xs'
                    : 'border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] hover:bg-neutral-100 disabled:opacity-40',
                )}
              >
                {entry}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          data-testid="pagination-next"
          onClick={() => onPageChange(safePage + 1)}
          disabled={disabled || safePage >= totalPages}
          aria-label="Next page"
          className="inline-flex min-h-10 sm:min-h-8 items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
