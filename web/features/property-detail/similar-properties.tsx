import React from 'react';
import Link from 'next/link';
import { PropertyCard } from '@/features/city/property-card';
import type { Property } from '@/lib/types';

interface SimilarPropertiesProps {
  properties: Property[];
  currentPropertyId: number;
  city: string;
}

export function SimilarProperties({
  properties,
  currentPropertyId,
  city,
}: SimilarPropertiesProps) {
  const similar = properties
    .filter((p) => p.id !== currentPropertyId)
    .slice(0, 3);

  if (similar.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-[var(--color-border-light)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-on-light)]">
            Similar Residences in {city}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mt-1">
            Other verified apartments with ergonomic workstations for remote professionals.
          </p>
        </div>
        <Link
          href={`/c/furnished-apartments-${city.toLowerCase()}`}
          className="text-xs sm:text-sm text-[var(--color-brand)] font-semibold hover:underline"
        >
          View all in {city} →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {similar.map((prop) => (
          <PropertyCard key={prop.id} property={prop} />
        ))}
      </div>
    </div>
  );
}
