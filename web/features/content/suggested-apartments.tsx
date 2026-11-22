import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormattedPrice } from '@/features/booking/formatted-price';
import { normalizeImageSrc, slugifySegment } from '@/lib/format';
import type { Property } from '@/lib/types';

interface SuggestedApartmentsProps {
  city: string;
  properties?: Property[];
}

export function SuggestedApartments({ city, properties = [] }: SuggestedApartmentsProps) {
  const citySlug = slugifySegment(city || 'madrid');
  const countLabel = properties.length > 0 ? `${properties.length} Stays` : 'All Stays';
  const displayProperties = properties.slice(0, 2);

  return (
    <div className="bg-[var(--color-text-on-light)] text-white rounded-2xl p-6 sm:p-8 mt-12 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Featured Residences in {city}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-dark-muted)] mt-1">
            Inspected homes equipped with executive standing desks, Aeron chairs, and verified fiber wifi.
          </p>
        </div>
        <Button asChild variant="primary" size="sm" pill className="shrink-0">
          <Link href={`/c/furnished-apartments-${citySlug}`}>
            View {countLabel} →
          </Link>
        </Button>
      </div>

      {displayProperties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--color-border-dark)]">
          {displayProperties.map((prop) => {
            const primaryImage = prop.images?.[0] || '/seed/property/prop-madrid-1.webp';

            return (
              <Link
                key={prop.id}
                href={`/l/apartments/${prop.slug}`}
                className="group flex gap-4 bg-[var(--color-bg-dark-surface)] hover:bg-[var(--color-bg-dark-elevated)] border border-[var(--color-border-dark)] rounded-xl p-3 transition-colors"
              >
                <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                  <Image
                    src={normalizeImageSrc(primaryImage, '/seed/property/prop-madrid-1.webp')}
                    alt={prop.title}
                    fill
                    sizes="96px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium text-[var(--color-brand)] truncate">
                        {prop.neighborhood}
                      </span>
                      {prop.workstation?.wifiSpeed && (
                        <Badge variant="neutral" className="text-[10px] py-0 px-1.5 h-4">
                          {prop.workstation.wifiSpeed} Mbps
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[var(--color-brand)] transition-colors">
                      {prop.title}
                    </h4>
                  </div>
                  <div className="text-xs font-medium text-white/90">
                    <span className="font-bold text-white">
                      <FormattedPrice amountUSDCents={prop.pricePerMonth} />
                    </span>
                    <span className="text-[var(--color-text-on-dark-muted)]"> / month</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
