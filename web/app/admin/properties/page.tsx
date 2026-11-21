'use client';

import React, { useState } from 'react';
import { PropertyModerationTable } from '@/features/admin/property-moderation-table';
import { FeaturedPropertiesManager } from '@/features/admin/featured-properties-manager';
import { Building, Sparkles } from 'lucide-react';

export default function AdminPropertiesPage() {
  const [viewMode, setViewMode] = useState<'moderation' | 'featured'>('moderation');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-[var(--color-text-on-light)] font-medium">Property Moderation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            Property Inventory & Moderation
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
            Audit host listing submissions, approve published units, and curate featured properties on the homepage.
          </p>
        </div>

        {/* View Switcher: Moderation vs Featured Manager */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('moderation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'moderation'
                ? 'bg-white dark:bg-[var(--color-bg-dark-surface)] text-[var(--color-text-on-light)] shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Building className="w-4 h-4" />
            Inventory & Moderation
          </button>
          <button
            type="button"
            onClick={() => setViewMode('featured')}
            data-testid="featured-tab-btn"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'featured'
                ? 'bg-white dark:bg-[var(--color-bg-dark-surface)] text-[var(--color-text-on-light)] shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Featured on Homepage
          </button>
        </div>
      </div>

      {viewMode === 'moderation' ? (
        <PropertyModerationTable />
      ) : (
        <FeaturedPropertiesManager />
      )}
    </div>
  );
}
