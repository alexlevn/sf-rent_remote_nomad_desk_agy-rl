'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCurrency } from '@/context/currency-context';
import { FavoriteButton } from '@/components/ui/favorite-button';
import { normalizeImageSrc } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
  detailQueryString?: string;
  isHighlighted?: boolean;
  onHover?: (id: number | null) => void;
  onClick?: (id: number) => void;
}

export function PropertyCard({
  property,
  detailQueryString = '',
  isHighlighted = false,
  onHover,
  onClick,
}: PropertyCardProps) {
  const { formatPrice } = useCurrency();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images =
    property.images && property.images.length > 0
      ? property.images
      : ['/seed/property/prop-madrid-1.webp'];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const detailUrl = `/l/apartments/${property.slug}${detailQueryString}`;

  return (
    <article
      data-property-id={property.id}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
        onClick?.(property.id);
      }}
      className={cn(
        'card-property group bg-white rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col',
        isHighlighted
          ? 'ring-2 ring-[var(--color-brand)] border-[var(--color-brand)] shadow-lg'
          : 'border-[var(--color-border-light)] shadow-xs hover:shadow-md'
      )}
    >
      {/* Property Photo Carousel Container */}
      <div className="relative h-[200px] w-full overflow-hidden bg-neutral-100">
        <Link href={detailUrl} className="block w-full h-full relative">
          <Image
            src={normalizeImageSrc(images[activeImageIndex])}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
          {property.isDirectBooking ? (
            <span className="bg-[var(--color-brand)] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              ⚡ Instant Book
            </span>
          ) : (
            <span className="bg-neutral-900/80 text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              Request
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <FavoriteButton
            propertyId={property.id}
            propertyTitle={property.title}
            variant="icon"
          />
        </div>

        {/* Wifi Speed Badge */}
        {(property.workstation?.wifiSpeed ?? 0) > 0 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
            <span className="bg-white/95 text-[var(--color-text-on-light)] text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              ⚡ {property.workstation?.wifiSpeed} Mbps
            </span>
          </div>
        )}

        {/* Carousel Prev/Next Buttons — visible on touch screens, hover-revealed on pointer */}
        {images.length > 1 && (
          <div className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 min-h-10 min-w-10 sm:min-h-7 sm:min-w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 text-xs z-20 cursor-pointer"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-10 min-w-10 sm:min-h-7 sm:min-w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 text-xs z-20 cursor-pointer"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="card-body p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs text-[var(--color-text-on-light-muted)] mb-1">
            {property.neighborhood} · {property.bedrooms}{' '}
            {property.bedrooms === 1 ? 'Bed' : 'Beds'} · {property.totalSurface} m²
          </div>

          <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-2 line-clamp-2 leading-snug group-hover:text-[var(--color-brand)] transition-colors">
            <Link href={detailUrl}>{property.title}</Link>
          </h3>

          <div className="text-xs text-[var(--color-text-on-light-muted)] bg-[var(--color-bg-light-subtle)] px-2.5 py-1.5 rounded-md mb-3 flex items-center gap-1.5 truncate border border-[var(--color-border-light)]/40">
            <span aria-hidden="true">🖥️</span>
            <span className="truncate">
              {property.workstation?.monitors || 'Dedicated Workstation Setup'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-surface-muted)] pt-3 mt-1">
          <div>
            <span className="font-bold text-[var(--color-brand)] text-lg">
              {formatPrice(property.pricePerMonth, { showCents: false })}
            </span>
            <span className="text-xs text-[var(--color-text-on-light-muted)]"> / mo</span>
          </div>
          <Link
            href={detailUrl}
            className="px-3.5 py-1.5 rounded-full border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
          >
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
