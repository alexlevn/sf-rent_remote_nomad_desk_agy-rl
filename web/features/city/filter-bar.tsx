'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/context/currency-context';
import { cn } from '@/lib/utils';
import type { CurrencyCode } from '@/lib/types';

const MIN_WIFI_SPEED_MBPS = 300;

const AMENITY_OPTIONS = [
  { id: 'balcony', label: 'Balcony' },
  { id: 'petFriendly', label: 'Pet Friendly' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'gym', label: 'Fitness Gym' },
  { id: 'kitchen', label: 'Full Kitchen' },
  { id: 'laundry', label: 'In-unit Laundry' },
  { id: 'terrace', label: 'Private Terrace' },
] as const;

export interface FilterState {
  bedrooms: number | null;
  minPrice: number | null; // cents
  maxPrice: number | null; // cents
  neighborhood: string | null;
  amenities: string[];
  instantBook: boolean;
  minWifi: number | null;
  moveIn: string | null;
  moveOut: string | null;
}

interface FilterBarProps {
  cityName: string;
  totalStays: number;
  filteredCount: number;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onOpenNeighborhoodModal: () => void;
  onClearFilters: () => void;
}

export function FilterBar({
  cityName,
  filteredCount,
  filters,
  onFilterChange,
  onOpenNeighborhoodModal,
  onClearFilters,
}: FilterBarProps) {
  const { currency, setCurrency } = useCurrency();

  const [openDropdown, setOpenDropdown] = useState<'bedrooms' | 'price' | 'amenities' | null>(null);
  const priceFilterKey = `${filters.minPrice ?? ''}:${filters.maxPrice ?? ''}`;
  const [prevPriceFilterKey, setPrevPriceFilterKey] = useState(priceFilterKey);
  const [minPriceInput, setMinPriceInput] = useState<string>(
    filters.minPrice !== null ? String(Math.round(filters.minPrice / 100)) : ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState<string>(
    filters.maxPrice !== null ? String(Math.round(filters.maxPrice / 100)) : ''
  );

  const filterBarRef = useRef<HTMLDivElement>(null);

  // Sync draft price inputs when URL filters are reset or changed externally
  if (prevPriceFilterKey !== priceFilterKey) {
    setPrevPriceFilterKey(priceFilterKey);
    setMinPriceInput(filters.minPrice !== null ? String(Math.round(filters.minPrice / 100)) : '');
    setMaxPriceInput(filters.maxPrice !== null ? String(Math.round(filters.maxPrice / 100)) : '');
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const hasActiveFilters =
    filters.bedrooms !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.neighborhood !== null ||
    filters.amenities.length > 0 ||
    filters.instantBook ||
    filters.minWifi !== null ||
    filters.moveIn !== null ||
    filters.moveOut !== null;

  const handleBedroomsSelect = (count: number | null) => {
    onFilterChange({ ...filters, bedrooms: count });
    setOpenDropdown(null);
  };

  const handlePriceApply = () => {
    const parsedMin = minPriceInput.trim() ? Number.parseInt(minPriceInput, 10) : null;
    const parsedMax = maxPriceInput.trim() ? Number.parseInt(maxPriceInput, 10) : null;
    let min = parsedMin !== null && Number.isFinite(parsedMin) ? Math.max(0, parsedMin) * 100 : null;
    let max = parsedMax !== null && Number.isFinite(parsedMax) ? Math.max(0, parsedMax) * 100 : null;
    if (min !== null && max !== null && min > max) {
      const swap = min;
      min = max;
      max = swap;
    }
    onFilterChange({ ...filters, minPrice: min, maxPrice: max });
    setOpenDropdown(null);
  };

  const handleAmenityToggle = (amenity: string) => {
    const isChecked = filters.amenities.includes(amenity);
    const newAmenities = isChecked
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    onFilterChange({ ...filters, amenities: newAmenities });
  };

  const handleInstantBookToggle = () => {
    onFilterChange({ ...filters, instantBook: !filters.instantBook });
  };

  const handleWifiToggle = () => {
    onFilterChange({ ...filters, minWifi: filters.minWifi ? null : MIN_WIFI_SPEED_MBPS });
  };

  const pillClass = (active: boolean) =>
    cn(
      'min-h-10 sm:min-h-8 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
      active
        ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand)] font-bold'
        : 'border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] hover:bg-neutral-50'
    );

  return (
    <div
      ref={filterBarRef}
      className="bg-white border-b border-[var(--color-border-light)] py-3 px-4 sm:px-6 sticky top-[74px] sm:top-20 z-40 shadow-xs"
    >
      <div className="max-w-[1728px] mx-auto flex items-center justify-between flex-wrap gap-3">
        {/* Left: City Info & Currency Switcher */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-[var(--color-text-on-light)]">{cityName}</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
            {filteredCount} {filteredCount === 1 ? 'Stay' : 'Stays'}
          </span>
          <div className="h-5 w-px bg-[var(--color-border-light)] mx-1 hidden sm:block" />

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            aria-label="Currency selector"
            className="min-h-10 sm:min-h-8 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--color-border-light)] bg-white cursor-pointer hover:bg-neutral-50 text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>

        {/* Right: Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bedrooms Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'bedrooms'}
              onClick={() => setOpenDropdown(openDropdown === 'bedrooms' ? null : 'bedrooms')}
              className={pillClass(filters.bedrooms !== null)}
            >
              <span>
                {filters.bedrooms !== null ? `Bedrooms: ${filters.bedrooms}` : 'Bedrooms (Any)'}
              </span>
              <span className="text-[10px]" aria-hidden="true">
                ▼
              </span>
            </button>

            {openDropdown === 'bedrooms' && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-[var(--color-border-light)] p-2 z-50">
                <div className="text-xs font-bold text-neutral-500 px-2 py-1 mb-1">
                  Filter by Bedrooms
                </div>
                {[
                  { value: null, label: 'Any Bedrooms' },
                  { value: 1, label: '1 Bedroom' },
                  { value: 2, label: '2 Bedrooms' },
                  { value: 3, label: '3+ Bedrooms' },
                ].map((opt) => {
                  const isSelected = filters.bedrooms === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleBedroomsSelect(opt.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-bold'
                          : 'hover:bg-neutral-100 text-[var(--color-text-on-light)]'
                      )}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'price'}
              onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
              className={pillClass(filters.minPrice !== null || filters.maxPrice !== null)}
            >
              <span>
                {filters.minPrice !== null || filters.maxPrice !== null
                  ? `Price: $${filters.minPrice !== null ? Math.round(filters.minPrice / 100) : '0'} - ${filters.maxPrice !== null ? '$' + Math.round(filters.maxPrice / 100) : 'Any'}`
                  : 'Price'}
              </span>
              <span className="text-[10px]" aria-hidden="true">
                ▼
              </span>
            </button>

            {openDropdown === 'price' && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-[var(--color-border-light)] p-4 z-50">
                <div className="text-xs font-bold text-neutral-700 mb-3">
                  Monthly Price Range ($)
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label
                      htmlFor="filter-min-price"
                      className="text-[10px] text-neutral-500 font-semibold block mb-1"
                    >
                      Min ($/mo)
                    </label>
                    <input
                      id="filter-min-price"
                      type="number"
                      min={0}
                      placeholder="800"
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border-light)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="filter-max-price"
                      className="text-[10px] text-neutral-500 font-semibold block mb-1"
                    >
                      Max ($/mo)
                    </label>
                    <input
                      id="filter-max-price"
                      type="number"
                      min={0}
                      placeholder="3000"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border-light)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-light)]">
                  <button
                    type="button"
                    onClick={() => {
                      setMinPriceInput('');
                      setMaxPriceInput('');
                      onFilterChange({ ...filters, minPrice: null, maxPrice: null });
                      setOpenDropdown(null);
                    }}
                    className="text-xs text-neutral-500 hover:text-black underline cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handlePriceApply}
                    className="px-4 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Neighborhoods Modal Trigger Button */}
          <button
            type="button"
            onClick={onOpenNeighborhoodModal}
            className={pillClass(filters.neighborhood !== null)}
          >
            <span>{filters.neighborhood ? `📍 ${filters.neighborhood}` : 'Neighborhoods'}</span>
          </button>

          {/* Amenities Popover Button */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === 'amenities'}
              onClick={() => setOpenDropdown(openDropdown === 'amenities' ? null : 'amenities')}
              className={pillClass(filters.amenities.length > 0)}
            >
              <span>
                {filters.amenities.length > 0
                  ? `Amenities (${filters.amenities.length})`
                  : 'Amenities'}
              </span>
              <span className="text-[10px]" aria-hidden="true">
                ▼
              </span>
            </button>

            {openDropdown === 'amenities' && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-[var(--color-border-light)] p-3 z-50">
                <div className="text-xs font-bold text-neutral-700 mb-2">Amenities Filter</div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {AMENITY_OPTIONS.map((item) => {
                    const isChecked = filters.amenities.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-50 text-xs text-[var(--color-text-on-light)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAmenityToggle(item.id)}
                          className="rounded text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Instant Book Direct Toggle */}
          <button
            type="button"
            aria-pressed={filters.instantBook}
            onClick={handleInstantBookToggle}
            className={pillClass(filters.instantBook)}
          >
            <span>⚡ Instant Book</span>
          </button>

          {/* Wifi Speed Direct Toggle */}
          <button
            type="button"
            aria-pressed={filters.minWifi !== null}
            onClick={handleWifiToggle}
            className={pillClass(filters.minWifi !== null)}
          >
            <span>📶 ≥ {MIN_WIFI_SPEED_MBPS} Mbps</span>
          </button>

          {/* Clear All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-semibold text-[var(--color-brand)] hover:underline px-2 py-1.5 min-h-10 sm:min-h-8 cursor-pointer transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
