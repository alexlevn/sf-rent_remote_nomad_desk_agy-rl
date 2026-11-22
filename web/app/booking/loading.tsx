import React from 'react';

export default function BookingLoading() {
  return (
    <div className="w-full min-h-[60vh] bg-[var(--color-bg-light)] py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-[var(--color-surface-muted)] rounded-xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-80 bg-white rounded-2xl border border-[var(--color-border-light)]" />
          <div className="h-80 bg-white rounded-2xl border border-[var(--color-border-light)]" />
        </div>
      </div>
    </div>
  );
}
