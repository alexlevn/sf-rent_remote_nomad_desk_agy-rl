'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HOME_CONTENT } from '@/content/home';
import { BOOKING_RULES } from '@/content/booking-rules';
import { diffUtcNights, slugifySegment } from '@/lib/format';
import type { Location } from '@/lib/types';

interface HeroSearchProps {
  locations: Location[];
  defaultMoveIn?: string;
  defaultMoveOut?: string;
}

export function HeroSearch({
  locations,
  defaultMoveIn = '2026-12-01',
  defaultMoveOut = '2026-12-31',
}: HeroSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialCitySlug =
    locations.find((loc) => loc.slug === 'madrid')?.slug ?? locations[0]?.slug ?? 'madrid';

  const [city, setCity] = useState(initialCitySlug);
  const [moveIn, setMoveIn] = useState(defaultMoveIn);
  const [moveOut, setMoveOut] = useState(defaultMoveOut);
  const [warning, setWarning] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Reset navigation guard on route change or BFCache restore
  useEffect(() => {
    isNavigatingRef.current = false;
    const handlePageShow = () => {
      isNavigatingRef.current = false;
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNavigatingRef.current) return;

    if (moveIn && moveOut) {
      const diffDays = diffUtcNights(moveIn, moveOut);
      if (diffDays < BOOKING_RULES.minimumStayNights) {
        setWarning(HOME_CONTENT.hero.dateWarning);
        return;
      }
    }

    setWarning(null);
    isNavigatingRef.current = true;

    const query = new URLSearchParams();
    if (moveIn) query.set('move_in', moveIn);
    if (moveOut) query.set('move_out', moveOut);

    const targetCity = slugifySegment(city) || 'madrid';
    const qs = query.toString();
    const destinationUrl = `/c/furnished-apartments-${targetCity}${qs ? `?${qs}` : ''}`;

    router.push(destinationUrl);
  };

  return (
    <section className="relative pt-24 sm:pt-28 pb-16 sm:pb-20 bg-gradient-to-b from-neutral-900 to-neutral-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
          <Badge variant="accent" className="mb-4 py-1.5 px-3.5 text-xs sm:text-sm font-medium">
            {HOME_CONTENT.hero.badge}
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] lg:leading-[44px] font-bold tracking-tight text-white mb-4 sm:mb-5 leading-tight">
            {HOME_CONTENT.hero.title}
          </h1>
          <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            {HOME_CONTENT.hero.subtitle}
          </p>
        </div>

        {/* Hero Search Box Widget */}
        <div className="max-w-4xl mx-auto bg-neutral-900/90 border border-neutral-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 items-stretch md:items-end"
          >
            {/* Destination select */}
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="hero-destination"
                className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider"
              >
                {HOME_CONTENT.hero.destinationLabel}
              </label>
              <select
                id="hero-destination"
                name="destination"
                aria-label="Destination"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setWarning(null);
                }}
                className="w-full bg-neutral-800 text-white border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent cursor-pointer"
              >
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <option key={loc.id} value={loc.slug}>
                      {loc.name}, {loc.country} ({loc.propertiesCount} stays)
                    </option>
                  ))
                ) : (
                  <option value="madrid">Madrid, Spain</option>
                )}
              </select>
            </div>

            {/* Move-in date */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="hero-move-in"
                className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider"
              >
                {HOME_CONTENT.hero.moveInLabel}
              </label>
              <input
                id="hero-move-in"
                name="move_in"
                type="date"
                value={moveIn}
                onChange={(e) => {
                  setMoveIn(e.target.value);
                  setWarning(null);
                }}
                className="w-full bg-neutral-800 text-white border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
              />
            </div>

            {/* Move-out date */}
            <div className="flex-1 min-w-[150px]">
              <label
                htmlFor="hero-move-out"
                className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider"
              >
                {HOME_CONTENT.hero.moveOutLabel}
              </label>
              <input
                id="hero-move-out"
                name="move_out"
                type="date"
                value={moveOut}
                onChange={(e) => {
                  setMoveOut(e.target.value);
                  setWarning(null);
                }}
                className="w-full bg-neutral-800 text-white border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
              />
            </div>

            {/* Search Submit button */}
            <div className="min-w-[170px] pt-1 md:pt-0">
              <Button
                type="submit"
                size="lg"
                pill
                className="w-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {HOME_CONTENT.hero.searchButton}
              </Button>
            </div>
          </form>

          {/* Validation Warning Alert */}
          {warning && (
            <div
              role="alert"
              className="mt-4 bg-red-950/60 border border-red-800/80 rounded-xl p-3 text-xs sm:text-sm text-red-200 flex items-start gap-2"
            >
              <span className="font-bold text-red-400" aria-hidden="true">
                ⚠️
              </span>
              <div>{warning}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
