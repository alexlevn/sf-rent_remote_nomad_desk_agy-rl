'use client';

import React from 'react';
import { Search } from 'lucide-react';
import type { HostProfile } from '@/lib/types';
import type { AdminPropertiesStatusCounts } from '@/lib/api/properties';
import { cn } from '@/lib/utils';

export type ModerationTab = 'pending_review' | 'published' | 'hidden' | 'draft' | 'rejected' | 'all';

const TABS: ReadonlyArray<{ id: ModerationTab; label: string }> = [
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Published' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'draft', label: 'Draft' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All Listings' },
];

const SELECT_CLASS =
  'w-full text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20';
const FILTER_LABEL_CLASS = 'block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1';

interface ModerationTabsProps {
  activeTab: ModerationTab;
  counts: AdminPropertiesStatusCounts;
  onChange: (tab: ModerationTab) => void;
}

export function ModerationTabs({ activeTab, counts, onChange }: ModerationTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] pb-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            activeTab === tab.id
              ? 'bg-[var(--color-brand)] text-white shadow-sm'
              : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100',
          )}
        >
          {tab.label} ({counts[tab.id]})
        </button>
      ))}
    </div>
  );
}

interface ModerationFiltersProps {
  cities: string[];
  hosts: HostProfile[];
  cityFilter: string;
  hostFilter: string;
  searchQuery: string;
  onCityChange: (city: string) => void;
  onHostChange: (hostId: string) => void;
  onSearchChange: (query: string) => void;
}

export function ModerationFilters({
  cities,
  hosts,
  cityFilter,
  hostFilter,
  searchQuery,
  onCityChange,
  onHostChange,
  onSearchChange,
}: ModerationFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-[var(--color-border-light)]">
      <div>
        <label className={FILTER_LABEL_CLASS}>Filter by City</label>
        <select value={cityFilter} onChange={(e) => onCityChange(e.target.value)} className={SELECT_CLASS}>
          <option value="all">All Cities ({cities.length})</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={FILTER_LABEL_CLASS}>Filter by Host</label>
        <select value={hostFilter} onChange={(e) => onHostChange(e.target.value)} className={SELECT_CLASS}>
          <option value="all">All Hosts ({hosts.length})</option>
          {hosts.map((h) => (
            <option key={h.id} value={String(h.id)}>
              {h.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="admin-properties-search" className={FILTER_LABEL_CLASS}>
          Search Listings
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="admin-properties-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Title, ND-PROP, neighborhood..."
            className="w-full text-sm py-2 pl-9 pr-3 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
      </div>
    </div>
  );
}
