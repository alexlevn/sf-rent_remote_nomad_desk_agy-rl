'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterBar, type FilterState } from './filter-bar';
import { PropertyCard } from './property-card';
import { InteractiveMapMock } from './interactive-map-mock';
import { NeighborhoodModal } from './neighborhood-modal';
import type { Location, Property } from '@/lib/types';

interface CityViewContainerProps {
  city: Location;
  allCityProperties: Property[];
  initialFilters: FilterState;
}

export function CityViewContainer({
  city,
  allCityProperties,
  initialFilters,
}: CityViewContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive filters from URL searchParams (single source of truth)
  const bedroomsParam = searchParams.get('bedrooms');
  const minPriceParam = searchParams.get('min_price') || searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('max_price') || searchParams.get('maxPrice');
  const neighborhoodParam = searchParams.get('neighborhood');
  const instantParam = searchParams.get('instant') || searchParams.get('isDirectBooking');
  const wifiParam = searchParams.get('wifi') || searchParams.get('minWifiSpeed');
  const moveInParam = searchParams.get('move_in') || searchParams.get('moveIn');
  const moveOutParam = searchParams.get('move_out') || searchParams.get('moveOut');
  const amenitiesParam = searchParams.getAll('amenities');

  const filters: FilterState = useMemo(() => {
    return {
      bedrooms: bedroomsParam !== null ? parseInt(bedroomsParam, 10) : initialFilters.bedrooms,
      minPrice: minPriceParam !== null ? parseInt(minPriceParam, 10) * 100 : initialFilters.minPrice,
      maxPrice: maxPriceParam !== null ? parseInt(maxPriceParam, 10) * 100 : initialFilters.maxPrice,
      neighborhood: neighborhoodParam !== null ? neighborhoodParam : initialFilters.neighborhood,
      amenities: amenitiesParam.length > 0 ? amenitiesParam : initialFilters.amenities,
      instantBook: instantParam !== null ? instantParam === 'true' : initialFilters.instantBook,
      minWifi: wifiParam !== null ? parseInt(wifiParam, 10) : initialFilters.minWifi,
      moveIn: moveInParam !== null ? moveInParam : initialFilters.moveIn,
      moveOut: moveOutParam !== null ? moveOutParam : initialFilters.moveOut,
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
    amenitiesParam,
    initialFilters,
  ]);

  // Synchronized active/hovered property
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<number | null>(null);

  // Mobile full-screen map modal open state (AC-LIST-4)
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  // Neighborhood selector modal open state
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false);

  // Calculate available neighborhoods with stay counts
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

  // Client-side filtering logic
  const filteredProperties = useMemo(() => {
    return allCityProperties.filter((property) => {
      // Bedrooms filter (AC-LIST-2: Bedrooms = 2 displays only 2-bedroom stays; 3+ displays >= 3)
      if (filters.bedrooms !== null) {
        if (filters.bedrooms >= 3) {
          if (property.bedrooms < 3) return false;
        } else {
          if (property.bedrooms !== filters.bedrooms) return false;
        }
      }

      // Min price filter
      if (filters.minPrice !== null && property.pricePerMonth < filters.minPrice) {
        return false;
      }

      // Max price filter
      if (filters.maxPrice !== null && property.pricePerMonth > filters.maxPrice) {
        return false;
      }

      // Neighborhood filter
      if (
        filters.neighborhood !== null &&
        property.neighborhood.toLowerCase() !== filters.neighborhood.toLowerCase()
      ) {
        return false;
      }

      // Instant Book filter
      if (filters.instantBook && !property.isDirectBooking) {
        return false;
      }

      // Wifi speed filter
      if (filters.minWifi !== null && (property.workstation?.wifiSpeed || 0) < filters.minWifi) {
        return false;
      }

      // Amenities filter
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

  // Update browser URL query params without reloading
  const updateUrlParams = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams();

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
    [router]
  );

  const handleFilterChange = (newFilters: FilterState) => {
    updateUrlParams(newFilters);
  };

  const handleClearFilters = () => {
    router.push(window.location.pathname, { scroll: false });
  };

  const handleSelectNeighborhood = (neighborhood: string | null) => {
    const updated = { ...filters, neighborhood };
    updateUrlParams(updated);
  };

  const handleSelectProperty = (id: number) => {
    setHighlightedPropertyId(id);
    // Smooth scroll corresponding card into view if on desktop
    const cardEl = document.querySelector(`[data-property-id="${id}"]`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Filter Bar (AC-LIST-2, AC-LIST-3) */}
      <FilterBar
        cityName={city.name || city.city}
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
        <div className="listing-list flex-1 p-4 sm:p-6 lg:p-8 lg:max-w-[950px] lg:w-[55%]">
          {/* List Title & Sort Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-[32px] sm:leading-[32px] font-bold text-[var(--color-text-on-light)]">
              Furnished Monthly Stays in {city.name || city.city}
            </h1>
            <div className="text-xs text-[var(--color-text-on-light-muted)]">
              Sort by: <strong className="text-[var(--color-text-on-light)]">Recommended</strong>
            </div>
          </div>

          {/* Listings Grid (or Empty State) */}
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isHighlighted={highlightedPropertyId === property.id}
                  onHover={setHighlightedPropertyId}
                  onClick={handleSelectProperty}
                />
              ))}
            </div>
          ) : (
            /* Empty State Container */
            <div className="bg-white rounded-2xl border border-[var(--color-border-light)] p-12 text-center my-6">
              <div className="text-4xl mb-3">🏘️</div>
              <h2 className="text-base font-bold text-[var(--color-text-on-light)] mb-1">
                No apartments match your search criteria
              </h2>
              <p className="text-xs text-[var(--color-text-on-light-muted)] max-w-md mx-auto mb-5">
                Try loosening your filters (bedrooms, price range, or amenities) to see all{' '}
                {allCityProperties.length} available {city.name || city.city} residences.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn-primary btn-sm px-5 py-2 rounded-full bg-[var(--color-brand)] text-white font-semibold text-xs hover:bg-[var(--color-brand-dark)] transition-colors shadow-sm cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Map Mock (45% sticky on desktop, AC-LIST-1) */}
        <div className="listing-map hidden lg:block lg:w-[45%] border-l border-[var(--color-border-light)] sticky top-0 sm:top-[136px] h-[calc(100vh-136px)]">
          <InteractiveMapMock
            properties={filteredProperties}
            highlightedPropertyId={highlightedPropertyId}
            onSelectProperty={handleSelectProperty}
            onHoverProperty={setHighlightedPropertyId}
            cityName={city.name || city.city}
          />
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) & Map Modal (AC-LIST-4) */}
      <button
        type="button"
        onClick={() => setIsMobileMapOpen(true)}
        aria-label="Open Map View"
        className="map-fab lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-bg-dark)] text-white font-bold shadow-xl cursor-pointer hover:bg-neutral-800 transition-all text-sm border border-neutral-700"
      >
        <span>🗺️</span>
        <span>Map</span>
      </button>

      {/* Mobile Fullscreen Map Overlay (AC-LIST-4) */}
      {isMobileMapOpen && (
        <InteractiveMapMock
          properties={filteredProperties}
          highlightedPropertyId={highlightedPropertyId}
          onSelectProperty={handleSelectProperty}
          onHoverProperty={setHighlightedPropertyId}
          cityName={city.name || city.city}
          isMobileFullscreen={true}
          onCloseMobile={() => setIsMobileMapOpen(false)}
        />
      )}

      {/* Neighborhoods Selection Modal */}
      <NeighborhoodModal
        isOpen={isNeighborhoodModalOpen}
        onClose={() => setIsNeighborhoodModalOpen(false)}
        cityName={city.name || city.city}
        neighborhoods={availableNeighborhoods}
        selectedNeighborhood={filters.neighborhood}
        onSelectNeighborhood={handleSelectNeighborhood}
      />

      {/* UI States & Verification Blocks (Faithful to design/c-furnished-apartments.html) */}
      <section className="max-w-[1728px] mx-auto w-full px-4 sm:px-6 lg:px-8 mt-12 mb-10">
        <div className="bg-neutral-50 rounded-2xl border border-[var(--color-border-light)] p-6">
          <div className="font-bold text-sm text-[var(--color-text-on-light)] mb-1">
            📋 UI States & Verification Blocks — Danh Sách Thành Phố & Bản Đồ (/c/furnished-apartments-:city)
          </div>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mb-4">
            These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zero Results Filter State */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-4 text-center">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 mb-2">
                Zero Results Filter State
              </span>
              <div className="text-2xl my-2">🏘️</div>
              <div className="font-semibold text-xs text-[var(--color-text-on-light)]">
                No apartments match &quot;Gym + Pool + Instant Book&quot;
              </div>
              <div className="text-[11px] text-[var(--color-text-on-light-muted)] mt-1">
                Clear selected amenities to see all {allCityProperties.length} available {city.name || city.city} residences.
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-3 px-3 py-1 rounded-full bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-dark)] transition-colors cursor-pointer"
              >
                Clear Filter Criteria
              </button>
            </div>

            {/* Interactive Map Pin Hover Preview */}
            <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-4">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 mb-2">
                Interactive Map Pin Hover
              </span>
              <div className="p-3 bg-[#faf8f5] border border-[var(--color-border-light)] rounded-lg mt-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--color-brand)] shrink-0" />
                  <span className="font-bold text-xs text-[var(--color-text-on-light)]">
                    $1,200/mo (Jerónimos)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-on-light-muted)] mt-1">
                  Highlighting property card #16060 on split list view.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
