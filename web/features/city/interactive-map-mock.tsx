'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useCurrency } from '@/context/currency-context';
import { normalizeImageSrc } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

const ZOOM_STEP = 0.15;
const MAX_ZOOM = 1.6;
const MIN_ZOOM = 0.85;

interface InteractiveMapMockProps {
  properties: Property[];
  highlightedPropertyId: number | null;
  selectedPropertyId?: number | null;
  detailQueryString?: string;
  onSelectProperty: (id: number | null) => void;
  onHoverProperty: (id: number | null) => void;
  cityName: string;
  isMobileFullscreen?: boolean;
  onCloseMobile?: () => void;
}

const SEED_PIN_POSITIONS: Record<number, { x: number; y: number }> = {
  16060: { x: 34, y: 36 }, // Madrid Jerónimos
  16061: { x: 64, y: 28 }, // Madrid Chamberí
  17001: { x: 44, y: 52 }, // Buenos Aires Palermo Chico
  17002: { x: 72, y: 38 }, // Buenos Aires Nuñez
  18001: { x: 38, y: 64 }, // Lima Miraflores
  18002: { x: 62, y: 76 }, // Lima Barranco
  19001: { x: 48, y: 44 }, // Barcelona Eixample
  19002: { x: 68, y: 32 }, // Barcelona Gràcia
};

export function InteractiveMapMock({
  properties,
  highlightedPropertyId,
  selectedPropertyId = null,
  detailQueryString = '',
  onSelectProperty,
  onHoverProperty,
  cityName,
  isMobileFullscreen = false,
  onCloseMobile,
}: InteractiveMapMockProps) {
  const { formatPrice } = useCurrency();
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const getPinPosition = (property: Property) => {
    if (SEED_PIN_POSITIONS[property.id]) {
      return SEED_PIN_POSITIONS[property.id];
    }
    const hash = property.id * 37 + (property.neighborhood?.charCodeAt(0) || 50);
    const x = 20 + (Math.abs(hash * 13) % 65);
    const y = 20 + (Math.abs(hash * 29) % 60);
    return { x, y };
  };

  // Prefer pinned (clicked) property so the user can move cursor onto the preview card and click View
  const previewPropertyId = selectedPropertyId ?? highlightedPropertyId;
  const activeProperty = properties.find((p) => p.id === previewPropertyId);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-[var(--color-map-land)] select-none',
        isMobileFullscreen ? 'fixed inset-0 z-50 w-full h-[100dvh]' : 'h-full min-h-[500px]'
      )}
    >
      {/* Mobile Close Button (AC-LIST-4) */}
      {isMobileFullscreen && onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="map-close inline-flex items-center gap-1.5 absolute top-4 left-4 z-50 min-h-10 px-4 py-2 rounded-full bg-white text-[var(--color-text-on-light)] font-semibold shadow-md border border-[var(--color-border-light)] text-sm cursor-pointer hover:bg-neutral-50 transition-colors"
        >
          ← List
        </button>
      )}

      {/* Map Canvas Background */}
      <div
        className="map-canvas relative w-full h-full transition-transform duration-300"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--color-map-grid)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
          <path
            d="M -50 250 Q 300 180 500 380 T 1200 450"
            fill="none"
            stroke="var(--color-map-water)"
            strokeWidth="32"
            strokeLinecap="round"
          />
          <path
            d="M 100 -50 L 700 800"
            fill="none"
            stroke="var(--color-bg-light-surface)"
            strokeWidth="10"
          />
          <path
            d="M -50 350 L 900 200"
            fill="none"
            stroke="var(--color-bg-light-surface)"
            strokeWidth="8"
          />
          <path
            d="M 300 -50 Q 350 400 850 700"
            fill="none"
            stroke="var(--color-bg-light-surface)"
            strokeWidth="6"
          />
          <rect
            x="36%"
            y="48%"
            width="14%"
            height="18%"
            rx="12"
            fill="var(--color-map-park)"
            opacity="0.8"
          />
          <text
            x="43%"
            y="58%"
            fill="var(--color-map-park-text)"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            City Park
          </text>
        </svg>

        {/* Styled Map Price Pins */}
        {properties.map((property) => {
          const pos = getPinPosition(property);
          const isActive =
            highlightedPropertyId === property.id || selectedPropertyId === property.id;
          const formattedPrice = formatPrice(property.pricePerMonth, { showCents: false });

          return (
            <div
              key={property.id}
              className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              <button
                type="button"
                data-pin-property-id={property.id}
                onClick={() => onSelectProperty(property.id)}
                onMouseEnter={() => onHoverProperty(property.id)}
                onMouseLeave={() => onHoverProperty(null)}
                aria-label={`Apartment at ${property.neighborhood}, ${formattedPrice} per month`}
                className={cn(
                  'map-pin px-3 py-1.5 rounded-full border text-xs font-bold shadow-md cursor-pointer transition-all duration-200 select-none whitespace-nowrap',
                  isActive
                    ? 'active bg-[var(--color-brand)] text-white border-[var(--color-brand)] scale-110 shadow-xl z-30 ring-4 ring-[var(--color-brand)]/20'
                    : 'bg-white text-[var(--color-text-on-light)] border-[var(--color-border-light)] hover:scale-105 hover:bg-neutral-50 z-10'
                )}
              >
                {formattedPrice}
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Active Property Preview Card */}
      {activeProperty && (
        <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-[var(--color-border-light)] p-3 z-40">
          {selectedPropertyId === activeProperty.id && (
            <button
              type="button"
              onClick={() => onSelectProperty(null)}
              aria-label="Close property preview"
              className="absolute -top-2.5 -right-2.5 min-h-8 min-w-8 rounded-full bg-white border border-[var(--color-border-light)] shadow-sm flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex gap-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
              <Image
                src={normalizeImageSrc(activeProperty.images?.[0])}
                alt={activeProperty.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold text-[var(--color-text-on-light-muted)] truncate">
                  {activeProperty.neighborhood} · {activeProperty.bedrooms} Bed
                </div>
                <h4 className="text-xs font-bold text-[var(--color-text-on-light)] truncate mt-0.5">
                  <Link
                    href={`/l/apartments/${activeProperty.slug}${detailQueryString}`}
                    className="hover:text-[var(--color-brand)]"
                  >
                    {activeProperty.title}
                  </Link>
                </h4>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border-light)]">
                <div>
                  <span className="text-sm font-bold text-[var(--color-brand)]">
                    {formatPrice(activeProperty.pricePerMonth, { showCents: false })}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-on-light-muted)]"> / mo</span>
                </div>
                <Link
                  href={`/l/apartments/${activeProperty.slug}${detailQueryString}`}
                  className="px-2.5 py-1 rounded-full bg-[var(--color-brand)] text-white text-[11px] font-semibold hover:bg-[var(--color-brand-hover)] transition-colors"
                >
                  View →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 bg-white rounded-xl shadow-md border border-[var(--color-border-light)] p-1">
        <button
          type="button"
          onClick={() => setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM))}
          aria-label="Zoom in"
          className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-lg flex items-center justify-center font-bold text-base hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
        >
          +
        </button>
        <div className="h-px bg-neutral-200 mx-1" />
        <button
          type="button"
          onClick={() => setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM))}
          aria-label="Zoom out"
          className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-lg flex items-center justify-center font-bold text-base hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
        >
          −
        </button>
      </div>

      {/* Map Attribution */}
      <div className="map-attrib absolute bottom-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium text-[var(--color-text-on-light-muted)] border border-[var(--color-border-light)]">
          📍 {cityName}
        </span>
        <span className="text-[10px] text-[var(--color-text-on-light-muted)]">
          Interactive map · pins = price / month
        </span>
      </div>
    </div>
  );
}
