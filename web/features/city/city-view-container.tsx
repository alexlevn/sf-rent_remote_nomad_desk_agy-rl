'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterBar, type FilterState } from './filter-bar';
import { PropertyCard } from './property-card';
import { InteractiveMapMock } from './interactive-map-mock';
import { NeighborhoodModal } from './neighborhood-modal';
import { FAQS } from '@/content/faqs';
import type { Location, Property } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRESERVED_WORKSTATION_PARAMS = [
  'workstation',
  'monitor',
  'chair',
  'desk',
  'km',
  'addons',
  'upgradeMonthlyEUR',
] as const;

interface CityViewContainerProps {
  city: Location;
  allCityProperties: Property[];
  initialFilters: FilterState;
}

function parseFiniteInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function CityViewContainer({ city, allCityProperties }: CityViewContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive filters strictly from URL searchParams (single source of truth, never fall back to stale initialFilters)
  const bedroomsParam = searchParams.get('bedrooms');
  const minPriceParam = searchParams.get('min_price') || searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('max_price') || searchParams.get('maxPrice');
  const neighborhoodParam = searchParams.get('neighborhood');
  const instantParam = searchParams.get('instant') || searchParams.get('isDirectBooking');
  const wifiParam = searchParams.get('wifi') || searchParams.get('minWifiSpeed');
  const moveInParam = searchParams.get('move_in') || searchParams.get('moveIn');
  const moveOutParam = searchParams.get('move_out') || searchParams.get('moveOut');
  const amenitiesParamKey = searchParams.getAll('amenities').join(',');

  const filters: FilterState = useMemo(() => {
    const minPriceVal = parseFiniteInt(minPriceParam);
    const maxPriceVal = parseFiniteInt(maxPriceParam);
    return {
      bedrooms: parseFiniteInt(bedroomsParam),
      minPrice: minPriceVal !== null ? minPriceVal * 100 : null,
      maxPrice: maxPriceVal !== null ? maxPriceVal * 100 : null,
      neighborhood: neighborhoodParam || null,
      amenities: amenitiesParamKey ? amenitiesParamKey.split(',').filter(Boolean) : [],
      instantBook: instantParam === 'true',
      minWifi: parseFiniteInt(wifiParam),
      moveIn: moveInParam || null,
      moveOut: moveOutParam || null,
    };
  }, [
    bedroomsParam,
    minPriceParam,
    maxPriceParam,
    neighborhoodParam,
    instantParam,
    wifiParam,
    moveInParam,
    moveOutParam,
    amenitiesParamKey,
  ]);

  // Forward move_in/move_out/workstation query params to apartment detail links
  const detailQueryString = useMemo(() => {
    const forward = new URLSearchParams();
    if (filters.moveIn) forward.set('move_in', filters.moveIn);
    if (filters.moveOut) forward.set('move_out', filters.moveOut);
    const workstation = searchParams.get('workstation');
    if (workstation) forward.set('workstation', workstation);
    const qs = forward.toString();
    return qs ? `?${qs}` : '';
  }, [filters.moveIn, filters.moveOut, searchParams]);

  const [hoveredPropertyId, setHoveredPropertyId] = useState<number | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const highlightedPropertyId = hoveredPropertyId ?? selectedPropertyId;

  const availableNeighborhoods = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const prop of allCityProperties) {
      if (prop.neighborhood) {
        countMap.set(prop.neighborhood, (countMap.get(prop.neighborhood) || 0) + 1);
      }
    }
    return Array.from(countMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [allCityProperties]);

  const filteredProperties = useMemo(() => {
    return allCityProperties.filter((property) => {
      if (filters.bedrooms !== null) {
        if (filters.bedrooms >= 3) {
          if (property.bedrooms < 3) return false;
        } else {
          if (property.bedrooms !== filters.bedrooms) return false;
        }
      }

      if (filters.minPrice !== null && property.pricePerMonth < filters.minPrice) {
        return false;
      }

      if (filters.maxPrice !== null && property.pricePerMonth > filters.maxPrice) {
        return false;
      }

      if (
        filters.neighborhood !== null &&
        property.neighborhood.toLowerCase() !== filters.neighborhood.toLowerCase()
      ) {
        return false;
      }

      if (filters.instantBook && !property.isDirectBooking) {
        return false;
      }

      if (filters.minWifi !== null && (property.workstation?.wifiSpeed || 0) < filters.minWifi) {
        return false;
      }

      if (filters.amenities.length > 0) {
        for (const am of filters.amenities) {
          const lower = am.toLowerCase();
          if (lower === 'balcony' && !property.balcony) return false;
          if ((lower === 'petfriendly' || lower === 'pets') && !property.petFriendly) return false;
          if (lower === 'pool' && !property.pool) return false;
          if (lower === 'gym' && !property.gym) return false;
          if (lower === 'kitchen' && !property.kitchen) return false;
          if (lower === 'laundry' && !property.laundry) return false;
          if (lower === 'terrace' && !property.terrace) return false;
        }
      }

      return true;
    });
  }, [allCityProperties, filters]);

  // Update browser URL query params while preserving Workstation Builder params
  const updateUrlParams = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams();

      for (const key of PRESERVED_WORKSTATION_PARAMS) {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      }

      if (newFilters.bedrooms !== null) {
        params.set('bedrooms', String(newFilters.bedrooms));
      }
      if (newFilters.minPrice !== null) {
        params.set('min_price', String(Math.round(newFilters.minPrice / 100)));
      }
      if (newFilters.maxPrice !== null) {
        params.set('max_price', String(Math.round(newFilters.maxPrice / 100)));
      }
      if (newFilters.neighborhood !== null) {
        params.set('neighborhood', newFilters.neighborhood);
      }
      if (newFilters.instantBook) {
        params.set('instant', 'true');
      }
      if (newFilters.minWifi !== null) {
        params.set('wifi', String(newFilters.minWifi));
      }
      if (newFilters.moveIn !== null) {
        params.set('move_in', newFilters.moveIn);
      }
      if (newFilters.moveOut !== null) {
        params.set('move_out', newFilters.moveOut);
      }
      for (const am of newFilters.amenities) {
        params.append('amenities', am);
      }

      const queryString = params.toString();
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  const handleFilterChange = (newFilters: FilterState) => {
    updateUrlParams(newFilters);
  };

  const handleClearFilters = () => {
    router.push(window.location.pathname, { scroll: false });
  };

  const handleSelectNeighborhood = (neighborhood: string | null) => {
    updateUrlParams({ ...filters, neighborhood });
  };

  const handleSelectProperty = (id: number | null) => {
    setSelectedPropertyId(id);
    if (id !== null) {
      const cardEl = document.querySelector(`[data-property-id="${id}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const cityDisplayName = city.name || city.city;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Filter Bar (AC-LIST-2, AC-LIST-3) */}
      <FilterBar
        cityName={cityDisplayName}
        totalStays={allCityProperties.length}
        filteredCount={filteredProperties.length}
        filters={filters}
        onFilterChange={handleFilterChange}
        onOpenNeighborhoodModal={() => setIsNeighborhoodModalOpen(true)}
        onClearFilters={handleClearFilters}
      />

      {/* Split-View Container (AC-LIST-1: 55% Left List, 45% Right Map on 1440px desktop) */}
      <div className="split-view max-w-[1728px] w-full mx-auto flex flex-col lg:flex-row flex-1 min-h-[calc(100vh-140px)]">
        {/* Left Column: Apartment Listings (55%) */}
        <div className="listing-list flex-1 min-w-0 p-4 sm:p-6 lg:p-8 lg:max-w-[950px] lg:w-[55%]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <h1 className="text-2xl sm:text-[32px] sm:leading-[32px] font-bold text-[var(--color-text-on-light)]">
              Furnished Monthly Stays in {cityDisplayName}
            </h1>
            <div className="text-xs text-[var(--color-text-on-light-muted)] shrink-0">
              Sort by: <strong className="text-[var(--color-text-on-light)]">Recommended</strong>
            </div>
          </div>

          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  detailQueryString={detailQueryString}
                  isHighlighted={highlightedPropertyId === property.id}
                  onHover={setHoveredPropertyId}
                  onClick={handleSelectProperty}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--color-border-light)] p-12 text-center my-6">
              <div className="text-4xl mb-3" aria-hidden="true">
                🏘️
              </div>
              <h2 className="text-base font-bold text-[var(--color-text-on-light)] mb-1">
                No apartments match your selected filters in {cityDisplayName}
              </h2>
              <p className="text-xs text-[var(--color-text-on-light-muted)] max-w-md mx-auto mb-5">
                Try loosening your filters (bedrooms, price range, or amenities) to see all{' '}
                {allCityProperties.length} available {cityDisplayName} residences.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-5 py-2.5 rounded-full bg-[var(--color-brand)] text-white font-semibold text-xs hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* City FAQs Accordion (Requirements §4.1 #3) */}
          <section className="mt-12 pt-8 border-t border-[var(--color-border-light)]">
            <h2 className="text-lg font-bold text-[var(--color-text-on-light)] mb-4">
              Monthly Rentals in {cityDisplayName} — FAQs
            </h2>
            <div className="space-y-2.5">
              {FAQS.slice(0, 4).map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={faq.question}
                    className="bg-white rounded-xl border border-[var(--color-border-light)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left text-xs sm:text-sm font-semibold text-[var(--color-text-on-light)] hover:text-[var(--color-brand)] transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <span
                        className={cn(
                          'ml-3 text-neutral-400 transition-transform',
                          isOpen ? 'rotate-180 text-[var(--color-brand)]' : '',
                        )}
                      >
                        ▾
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-[var(--color-text-on-light-muted)] leading-relaxed border-t border-neutral-100 pt-2.5">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Interactive Map Mock (45% sticky on desktop, AC-LIST-1) */}
        <div className="listing-map hidden lg:block lg:w-[45%] border-l border-[var(--color-border-light)] sticky top-[136px] h-[calc(100vh-136px)]">
          <InteractiveMapMock
            properties={filteredProperties}
            highlightedPropertyId={highlightedPropertyId}
            selectedPropertyId={selectedPropertyId}
            detailQueryString={detailQueryString}
            onSelectProperty={handleSelectProperty}
            onHoverProperty={setHoveredPropertyId}
            cityName={cityDisplayName}
          />
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) (AC-LIST-4) */}
      <button
        type="button"
        onClick={() => setIsMobileMapOpen(true)}
        aria-label="Open Map View"
        className="map-fab lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-bg-dark)] text-white font-bold shadow-xl cursor-pointer hover:bg-neutral-800 transition-all text-sm border border-neutral-700"
      >
        <span aria-hidden="true">🗺️</span>
        <span>Map</span>
      </button>

      {/* Mobile Fullscreen Map Overlay (AC-LIST-4) */}
      {isMobileMapOpen && (
        <InteractiveMapMock
          properties={filteredProperties}
          highlightedPropertyId={highlightedPropertyId}
          selectedPropertyId={selectedPropertyId}
          detailQueryString={detailQueryString}
          onSelectProperty={handleSelectProperty}
          onHoverProperty={setHoveredPropertyId}
          cityName={cityDisplayName}
          isMobileFullscreen={true}
          onCloseMobile={() => setIsMobileMapOpen(false)}
        />
      )}

      {/* Neighborhoods Selection Modal */}
      <NeighborhoodModal
        isOpen={isNeighborhoodModalOpen}
        onClose={() => setIsNeighborhoodModalOpen(false)}
        cityName={cityDisplayName}
        neighborhoods={availableNeighborhoods}
        selectedNeighborhood={filters.neighborhood}
        onSelectNeighborhood={handleSelectNeighborhood}
      />
    </div>
  );
}
