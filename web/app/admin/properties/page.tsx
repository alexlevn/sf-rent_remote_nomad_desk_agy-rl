'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PropertyModerationTable } from '@/features/admin/property-moderation-table';
import { FeaturedPropertiesManager } from '@/features/admin/featured-properties-manager';
import { Building, Plus, Sparkles } from 'lucide-react';

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

        {/* Actions & View Switcher: Add Property + Moderation vs Featured Manager */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <Link
            href="/admin/properties/new"
            data-testid="admin-add-property-btn"
            className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Property
          </Link>

          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('moderation')}
              className={`flex min-h-10 sm:min-h-8 items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'moderation'
                  ? 'bg-white text-[var(--color-text-on-light)] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Building className="w-4 h-4" />
              Inventory & Moderation
            </button>
            <button
              type="button"
              onClick={() => setViewMode('featured')}
              data-testid="featured-tab-btn"
              className={`flex min-h-10 sm:min-h-8 items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'featured'
                  ? 'bg-white text-[var(--color-text-on-light)] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Featured on Homepage
            </button>
          </div>
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
