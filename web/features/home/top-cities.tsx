import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HOME_CONTENT } from '@/content/home';
import { SITE_CONFIG } from '@/content/site';
import { normalizeImageSrc } from '@/lib/format';
import type { Location } from '@/lib/types';

const MAX_DISPLAY_CITIES = 8;

interface TopCitiesProps {
  locations: Location[];
}

export function TopCities({ locations }: TopCitiesProps) {
  const displayCities = locations.slice(0, MAX_DISPLAY_CITIES);

  return (
    <section className="py-16 sm:py-20 bg-[var(--color-bg-light-alt)] text-[var(--color-text-on-light)] border-t border-[var(--color-border-light)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-10 gap-4">
          <div>
            <Badge variant="neutral" className="mb-2">
              {HOME_CONTENT.cities.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
              {HOME_CONTENT.cities.title}
            </h2>
            <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1">
              {HOME_CONTENT.cities.subtitle}
            </p>
          </div>
          <Button asChild variant="outline" pill className="self-start sm:self-auto text-xs sm:text-sm">
            <Link href={SITE_CONFIG.links.cities}>
              {HOME_CONTENT.cities.exploreAllLabel}
            </Link>
          </Button>
        </div>

        {displayCities.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-[var(--color-border-light)] text-sm text-[var(--color-text-on-light-muted)]">
            No destinations available right now.
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayCities.map((location) => {
            const cityUrl = `/c/furnished-apartments-${location.slug}`;
            return (
              <Link
                key={location.id}
                href={cityUrl}
                className="group relative h-48 rounded-2xl overflow-hidden flex flex-col justify-end p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Background image */}
                <Image
                  src={normalizeImageSrc(location.image, '/seed/location/madrid.jpg')}
                  alt={location.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-500 brightness-75 group-hover:brightness-60"
                />

                {/* City details */}
                <div className="relative z-10">
                  <div className="font-bold text-lg leading-snug group-hover:text-[var(--color-brand)] transition-colors">
                    {location.name}
                  </div>
                  <div className="text-xs text-white/80 font-medium">
                    {location.country} · {location.propertiesCount} stays
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
