'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Heart } from 'lucide-react';
import type { Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { normalizeImageSrc } from '@/lib/format';
import { removeFavoriteAction } from '@/app/guests/favorites/actions';

const TOAST_DURATION_MS = 4000;
const STORAGE_KEY = 'nomaddesk_favorites';

export interface FavoritesViewProps {
  initialProperties: Property[];
  catalogProperties?: Property[];
  isAuthenticated?: boolean;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  initialProperties,
  catalogProperties = [],
  isAuthenticated = true,
}) => {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [removedToast, setRemovedToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const removingIdsRef = useRef<Set<number>>(new Set());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // When authenticated, DB is source of truth (sync localStorage to match);
  // when visitor, resolve localStorage saved IDs against published catalog.
  useEffect(() => {
    if (isAuthenticated) {
      startTransition(() => {
        setProperties(initialProperties);
      });
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(initialProperties.map((p) => p.id))
        );
      } catch {
        // Ignore storage errors
      }
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storedIds = JSON.parse(stored);
        if (Array.isArray(storedIds)) {
          const idSet = new Set<number>(storedIds.filter((id) => typeof id === 'number'));
          startTransition(() => {
            setProperties(catalogProperties.filter((p) => idSet.has(p.id)));
          });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [initialProperties, catalogProperties, isAuthenticated]);

  const handleRemove = async (property: Property) => {
    if (removingIdsRef.current.has(property.id)) return;
    removingIdsRef.current.add(property.id);
    setErrorMessage(null);

    const previousProperties = properties;
    setProperties((prev) => prev.filter((p) => p.id !== property.id));

    try {
      if (isAuthenticated) {
        const result = await removeFavoriteAction(property.id);
        if (!result.success) {
          setProperties(previousProperties);
          setErrorMessage(result.error || 'Failed to remove apartment from saved list.');
          return;
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.favoriteIds));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // Ignore storage errors
        }
        router.refresh();
      } else {
        try {
          const updatedIds = previousProperties
            .filter((p) => p.id !== property.id)
            .map((p) => p.id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // Ignore storage errors
        }
      }

      setRemovedToast(`Removed "${property.title}" from saved homes.`);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setRemovedToast(null), TOAST_DURATION_MS);
    } catch (err: unknown) {
      setProperties(previousProperties);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to remove apartment from saved list.'
      );
    } finally {
      removingIdsRef.current.delete(property.id);
    }
  };

  return (
    <div>
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-3.5 rounded-xl bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-xs sm:text-sm text-[var(--color-error-text)] flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--color-error)] shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorMessage(null)}
            className="inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 font-bold ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {removedToast && (
        <div
          role="status"
          className="mb-6 p-3 px-4 rounded-xl bg-[var(--color-bg-dark)] text-white text-xs flex items-center justify-between shadow-lg"
        >
          <span>{removedToast}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setRemovedToast(null)}
            className="inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 text-neutral-400 hover:text-white font-bold ml-4 cursor-pointer"
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
            Click the heart icon on any apartment card while browsing to save remote-ready homes for
            easy comparison.
          </p>
          <Link
            href="/c/furnished-apartments-madrid"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Browse Apartments
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => {
            const mainImage = normalizeImageSrc(prop.images?.[0]);
            const priceFormatted = formatPrice(prop.pricePerMonth, { perMonth: true });

            return (
              <div
                key={prop.id}
                className="bg-white border border-[var(--color-border-light)] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-neutral-100">
                  <Image
                    src={mainImage}
                    alt={prop.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemove(prop)}
                    title="Remove from saved"
                    aria-label={`Remove ${prop.title} from favorites`}
                    className="absolute top-3 right-3 min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-rose-500 hover:text-rose-700 shadow-sm transition-all hover:scale-110 cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </button>

                  {prop.isDirectBooking && (
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-brand)] text-white shadow-xs">
                        ⚡ Instant Book
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-[var(--color-text-on-light-muted)] font-medium mb-1.5 flex items-center gap-1.5">
                      <span>{prop.city}</span>
                      <span>·</span>
                      <span>
                        {prop.bedrooms} {prop.bedrooms === 1 ? 'Bed' : 'Beds'}
                      </span>
                      {(prop.workstation?.wifiSpeed ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>{prop.workstation?.wifiSpeed} Mbps</span>
                        </>
                      )}
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

                  <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold text-[var(--color-brand)]">
                      {priceFormatted}
                    </span>

                    <Link
                      href={`/l/apartments/${prop.slug}`}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)] transition-colors"
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
