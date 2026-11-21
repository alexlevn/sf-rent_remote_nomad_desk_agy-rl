'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import type { Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { removeFavoriteAction } from '@/app/guests/favorites/actions';

export interface FavoritesViewProps {
  initialProperties: Property[];
  userId?: number;
}

const STORAGE_KEY = 'nomaddesk_favorites';

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  initialProperties,
  userId = 1,
}) => {
  const { formatPrice } = useCurrency();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [removedToast, setRemovedToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Sync with localStorage on client mount using startTransition to satisfy React 19 rules
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storedIds: number[] = JSON.parse(stored);
        if (Array.isArray(storedIds)) {
          startTransition(() => {
            setProperties((prev) => {
              const idSet = new Set(storedIds);
              return prev.filter((p) => idSet.has(p.id));
            });
          });
        }
      } else {
        const ids = initialProperties.map((p) => p.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [initialProperties]);

  const handleRemove = async (property: Property) => {
    // Optimistically remove from state
    setProperties((prev) => prev.filter((p) => p.id !== property.id));

    // Update localStorage
    try {
      const currentStored = localStorage.getItem(STORAGE_KEY);
      const storedIds: number[] = currentStored ? JSON.parse(currentStored) : [];
      const updatedIds = storedIds.filter((id) => id !== property.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Ignore storage errors
    }

    // Call server action to update mock store
    try {
      await removeFavoriteAction(property.id, userId);
      setRemovedToast(`Removed "${property.title}" from saved homes.`);
      setTimeout(() => setRemovedToast(null), 4000);
    } catch {
      // Ignore server sync errors
    }
  };

  return (
    <div>
      {/* Toast Alert */}
      {removedToast && (
        <div className="mb-6 p-3 px-4 rounded-xl bg-neutral-900 text-white text-xs flex items-center justify-between shadow-lg">
          <span>{removedToast}</span>
          <button
            onClick={() => setRemovedToast(null)}
            className="text-neutral-400 hover:text-white font-bold ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Heading & Subtitle */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)] tracking-tight">
          Saved Apartments ({properties.length})
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Residences you&apos;ve bookmarked for upcoming nomadic stints.
        </p>
      </div>

      {/* Grid of Saved Apartments */}
      {properties.length === 0 ? (
        <div className="bg-white border border-[var(--color-border-light)] rounded-3xl p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-on-light)] mb-1">
            No saved apartments yet
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
            Click the heart icon on any apartment card while browsing to save remote-ready homes for easy comparison.
          </p>
          <Link
            href="/c/furnished-apartments-madrid"
            className="btn btn-primary btn-sm btn-pill inline-flex items-center"
          >
            Browse Apartments
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => {
            const mainImage = prop.images?.[0] || '/seed/property/prop-madrid-1.webp';
            const priceFormatted = formatPrice(prop.pricePerMonth, { perMonth: true });

            return (
              <div
                key={prop.id}
                className="bg-white border border-[var(--color-border-light)] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Photo & Heart Button */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-neutral-100">
                  <Image
                    src={mainImage}
                    alt={prop.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Red Heart Button to Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemove(prop)}
                    title="Remove from saved"
                    aria-label={`Remove ${prop.title} from favorites`}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-rose-500 hover:text-rose-700 shadow-sm transition-all hover:scale-110 cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </button>

                  {/* Instant Book badge if applicable */}
                  {prop.isDirectBooking && (
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-brand)] text-white shadow-xs">
                        ⚡ Instant Book
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-[var(--color-text-on-light-muted)] font-medium mb-1.5 flex items-center gap-1.5">
                      <span>{prop.city}</span>
                      <span>·</span>
                      <span>
                        {prop.bedrooms} {prop.bedrooms === 1 ? 'Bed' : 'Beds'}
                      </span>
                      <span>·</span>
                      <span>{prop.workstation?.wifiSpeed || 600} Mbps</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-on-light)] mb-3 line-clamp-2 leading-snug">
                      <Link
                        href={`/l/apartments/${prop.slug}`}
                        className="hover:text-[var(--color-brand)] transition-colors"
                      >
                        {prop.title}
                      </Link>
                    </h3>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center justify-between">
                    <div>
                      <span className="text-base sm:text-lg font-bold text-[var(--color-brand)]">
                        {priceFormatted}
                      </span>
                    </div>

                    <Link
                      href={`/l/apartments/${prop.slug}`}
                      className="btn btn-outline btn-sm inline-flex items-center gap-1 text-xs px-3.5"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
