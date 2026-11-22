import React from 'react';

export default function GuestsLoading() {
  return (
    <div className="w-full min-h-[60vh] bg-[var(--color-bg-light)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-[var(--color-surface-muted)] rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-white rounded-2xl border border-[var(--color-border-light)]" />
          <div className="h-24 bg-white rounded-2xl border border-[var(--color-border-light)]" />
          <div className="h-24 bg-white rounded-2xl border border-[var(--color-border-light)]" />
          <div className="h-24 bg-white rounded-2xl border border-[var(--color-border-light)]" />
        </div>
        <div className="h-64 bg-white rounded-2xl border border-[var(--color-border-light)]" />
      </div>
    </div>
  );
}
