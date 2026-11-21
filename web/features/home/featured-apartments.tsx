'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/context/currency-context';
import { HOME_CONTENT } from '@/content/home';
import { SITE_CONFIG } from '@/content/site';
import type { Property } from '@/lib/types';

const MAX_DISPLAY_FEATURED = 6;

interface FeaturedApartmentsProps {
  properties: Property[];
}

function ApartmentCard({ property }: { property: Property }) {
  const { formatPrice } = useCurrency();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = property.images && property.images.length > 0
    ? property.images
    : ['/seed/property/placeholder.webp'];

  const normalizeSrc = (src: string) => (src.startsWith('/') ? src : `/${src}`);

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

  const detailUrl = `/l/apartments/${property.slug}`;

  return (
    <article className="group bg-white rounded-2xl overflow-hidden border border-[var(--color-border-light)] shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Image Carousel */}
      <div className="relative h-60 w-full overflow-hidden bg-neutral-100">
        <Link href={detailUrl} className="block w-full h-full">
          <Image
            src={normalizeSrc(images[activeImageIndex])}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="bg-black/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-xs">
            {property.city}
          </span>
          {property.isDirectBooking ? (
            <span className="bg-[var(--color-brand)] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              Instant Book
            </span>
          ) : (
            <span className="bg-black/80 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-xs">
              Request to Book
            </span>
          )}
        </div>

        {/* Wifi Speed Badge */}
        {property.workstation?.wifiSpeed && (
          <div className="absolute bottom-3 right-3 z-10">
            <span className="bg-white/95 text-[var(--color-text-on-light)] text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              ⚡ {property.workstation.wifiSpeed} Mbps
            </span>
          </div>
        )}

        {/* Carousel controls if multiple images */}
        {images.length > 1 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 text-sm z-10"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 text-sm z-10"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === activeImageIndex ? 'bg-white w-3' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line */}
          <div className="flex items-center justify-between text-xs text-[var(--color-text-on-light-muted)] font-medium mb-2">
            <span>
              {property.neighborhood} · {property.bedrooms} Bed · {property.totalSurface} m²
            </span>
            <Badge variant="success" className="text-[11px] py-0.5 px-2">
              Verified Desk
            </Badge>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-3 line-clamp-2 h-12 leading-snug">
            <Link href={detailUrl} className="hover:text-[var(--color-brand)] transition-colors">
              {property.title}
            </Link>
          </h3>

          {/* Workstation Specification Box */}
          <div className="bg-[#faf8f5] border border-[#f0ede8] rounded-xl p-3 mb-4 text-xs text-[#4a3e33]">
            <div className="font-semibold text-xs mb-1 flex items-center gap-1.5">
              <span>🖥️</span>
              <span className="truncate">{property.workstation?.monitors || 'Dual 27" 4K UHD Monitors'}</span>
            </div>
            <div className="text-[var(--color-text-on-light-muted)] flex items-center gap-1.5">
              <span>💺</span>
              <span className="truncate">{property.workstation?.chair || 'Ergonomic Executive Seating'}</span>
            </div>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center justify-between mt-auto">
          <div>
            <span className="text-lg font-bold text-[var(--color-brand)]">
              {formatPrice(property.pricePerMonth)}
            </span>
            <span className="text-xs text-[var(--color-text-on-light-muted)]"> / month</span>
          </div>
          <Button asChild variant="outline" size="sm" pill>
            <Link href={detailUrl}>View Home</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function FeaturedApartments({ properties }: FeaturedApartmentsProps) {
  // Ensure we display up to MAX_DISPLAY_FEATURED featured properties
  const displayProperties = properties.slice(0, MAX_DISPLAY_FEATURED);

  return (
    <section className="py-16 sm:py-20 bg-[var(--color-bg-light)] text-[var(--color-text-on-light)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-10 gap-4">
          <div>
            <Badge variant="accent" className="mb-2">
              {HOME_CONTENT.featured.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
              {HOME_CONTENT.featured.title}
            </h2>
            <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1">
              {HOME_CONTENT.featured.subtitle}
            </p>
          </div>
          <Button asChild variant="outline" pill className="self-start sm:self-auto text-xs sm:text-sm">
            <Link href={SITE_CONFIG.links.browse}>
              {HOME_CONTENT.featured.exploreAllLabel}
            </Link>
          </Button>
        </div>

        {/* Apartments Grid: 1 col on mobile 390px, 2 on tablet, 3 on desktop */}
        {displayProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayProperties.map((property) => (
              <ApartmentCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-[var(--color-border-light)] p-8">
            <p className="text-sm text-[var(--color-text-on-light-muted)] mb-4">
              No featured apartments found at the moment.
            </p>
            <Button asChild variant="outline" size="sm" pill>
              <Link href={SITE_CONFIG.links.browse}>Explore All Listings</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
