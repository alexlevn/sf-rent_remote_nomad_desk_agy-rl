'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GuestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center bg-[var(--color-bg-light)] px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[var(--color-error-border)] rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[var(--color-error-bg)] text-[var(--color-error)] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text-on-light)] mb-2">
          Unable to load Guest Portal
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
          {error.message || 'An unexpected error occurred while loading your account.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button type="button" variant="primary" size="sm" pill onClick={reset}>
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full border border-[var(--color-border-light)] text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
