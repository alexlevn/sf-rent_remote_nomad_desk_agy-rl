'use client';

import { useState, useMemo } from 'react';
import type { Location } from '@/lib/types';
import { CountryGroup, type CitySummary } from './country-group';
import { cn } from '@/lib/utils';

interface DestinationsDirectoryProps {
  locations: Location[];
}

interface CountryData {
  country: string;
  continent: string;
  totalApartments: number;
  cities: CitySummary[];
}

export function DestinationsDirectory({ locations }: DestinationsDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('All');

  // Group locations by country
  const allCountries = useMemo<CountryData[]>(() => {
    const map = new Map<string, CountryData>();

    locations.forEach((loc) => {
      const countryName = loc.country || 'Global';
      const existing = map.get(countryName);

      const citySummary: CitySummary = {
        name: loc.name || loc.city,
        slug: loc.slug,
        propertiesCount: loc.propertiesCount || 0,
      };

      if (existing) {
        existing.cities.push(citySummary);
        existing.totalApartments += citySummary.propertiesCount;
      } else {
        map.set(countryName, {
          country: countryName,
          continent: loc.continent || 'Other',
          totalApartments: citySummary.propertiesCount,
          cities: [citySummary],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalApartments - a.totalApartments);
  }, [locations]);

  // Extract unique continents for filtering
  const continents = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((loc) => {
      if (loc.continent) set.add(loc.continent);
    });
    return ['All', ...Array.from(set).sort()];
  }, [locations]);

  // Filter countries and cities based on search query and continent
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allCountries
      .filter((item) => {
        if (selectedContinent !== 'All' && item.continent !== selectedContinent) {
          return false;
        }
        if (!q) return true;

        const countryMatch = item.country.toLowerCase().includes(q);
        const cityMatch = item.cities.some((c) => c.name.toLowerCase().includes(q));
        return countryMatch || cityMatch;
      })
      .map((item) => {
        if (!q) return item;

        // If query matches country name, show all cities in that country
        if (item.country.toLowerCase().includes(q)) {
          return item;
        }

        // Otherwise filter only matching cities within the country
        const matchedCities = item.cities.filter((c) => c.name.toLowerCase().includes(q));
        const filteredTotal = matchedCities.reduce((sum, c) => sum + c.propertiesCount, 0);

        return {
          ...item,
          totalApartments: filteredTotal,
          cities: matchedCities,
        };
      })
      .filter((item) => item.cities.length > 0);
  }, [allCountries, searchQuery, selectedContinent]);

  const totalFilteredCities = useMemo(() => {
    return filteredCountries.reduce((sum, c) => sum + c.cities.length, 0);
  }, [filteredCountries]);

  return (
    <div className="w-full">
      {/* Controls & Quick Search bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-[var(--color-text-on-light-muted)]">
          Showing <strong className="text-[var(--color-text-on-light)] font-semibold">{totalFilteredCities} {totalFilteredCities === 1 ? 'destination' : 'destinations'}</strong>{' '}
          {selectedContinent === 'All'
            ? `across ${allCountries.length} ${allCountries.length === 1 ? 'country' : 'countries'} worldwide`
            : `in ${selectedContinent}`}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Continent Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--color-surface-muted)] rounded-xl text-xs font-medium">
            {continents.map((cont) => (
              <button
                key={cont}
                type="button"
                onClick={() => setSelectedContinent(cont)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  selectedContinent === cont
                    ? 'bg-white text-[var(--color-brand)] shadow-xs font-semibold'
                    : 'text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)]',
                )}
              >
                {cont}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick search city or country..."
              aria-label="Quick search city or country"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-on-light-muted)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Country Groups List */}
      {filteredCountries.length > 0 ? (
        <div className="space-y-6">
          {filteredCountries.map((c) => (
            <CountryGroup
              key={c.country}
              country={c.country}
              continent={c.continent}
              totalApartments={c.totalApartments}
              cities={c.cities}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-dashed border-[var(--color-border-light)] rounded-2xl p-12 text-center my-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-surface-muted)] flex items-center justify-center text-2xl text-[var(--color-text-on-light-muted)]">
            🔍
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-on-light)] mb-2">
            No destinations found
          </h3>
          <p className="text-sm text-[var(--color-text-on-light-muted)] max-w-md mx-auto mb-6">
            {searchQuery.trim()
              ? `We couldn't find any remote work destinations matching "${searchQuery.trim()}". Try checking the spelling or browse all countries.`
              : `No remote work destinations are currently available in ${selectedContinent}.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedContinent('All');
            }}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-all"
          >
            Clear Search Filters
          </button>
        </div>
      )}
    </div>
  );
}
