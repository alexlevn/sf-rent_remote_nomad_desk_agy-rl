import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocationBySlug } from '@/lib/api/locations';
import { listProperties } from '@/lib/api/properties';
import { stripHtmlTags } from '@/lib/validations/content';
import { CityViewContainer } from '@/features/city/city-view-container';
import type { FilterState } from '@/features/city/filter-bar';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

function parseFiniteInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const location = await getLocationBySlug(citySlug);

  if (!location || location.isActive === false) {
    return {
      title: 'City Not Found | NomadDesk',
    };
  }

  const cityName = location.name || location.city;
  const cleanDescription = location.description ? stripHtmlTags(location.description) : '';
  const description =
    cleanDescription ||
    `Browse verified monthly furnished apartments in ${cityName} with dedicated ergonomic workstations and certified high-speed fiber internet for digital nomads.`;
  const canonicalPath = `/c/furnished-apartments-${location.slug}`;

  return {
    title: `Furnished Apartments in ${cityName}, ${location.country} | NomadDesk`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `Furnished Apartments in ${cityName}, ${location.country} | NomadDesk`,
      description,
      url: canonicalPath,
      type: 'website',
    },
  };
}

function CityViewSkeleton() {
  return (
    <div className="flex flex-col min-h-screen animate-pulse">
      <div className="bg-white border-b border-[var(--color-border-light)] py-4 px-6 h-16 flex items-center justify-between">
        <div className="w-48 h-6 bg-neutral-200 rounded" />
        <div className="flex gap-2">
          <div className="w-24 h-8 bg-neutral-200 rounded-full" />
          <div className="w-24 h-8 bg-neutral-200 rounded-full" />
        </div>
      </div>
      <div className="max-w-[1728px] w-full mx-auto flex flex-col lg:flex-row flex-1 p-6 gap-6">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="h-80 bg-neutral-200 rounded-2xl" />
          <div className="h-80 bg-neutral-200 rounded-2xl" />
        </div>
        <div className="hidden lg:block lg:w-[45%] h-[600px] bg-neutral-200 rounded-2xl" />
      </div>
    </div>
  );
}

export default async function CityApartmentsPage({ params, searchParams }: PageProps) {
  const { city: citySlug } = await params;
  const location = await getLocationBySlug(citySlug);

  if (!location || location.isActive === false) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;

  const moveIn = firstString(resolvedSearchParams.move_in ?? resolvedSearchParams.moveIn);
  const moveOut = firstString(resolvedSearchParams.move_out ?? resolvedSearchParams.moveOut);
  const bedroomsParam = firstString(resolvedSearchParams.bedrooms);
  const minPriceParam = firstString(resolvedSearchParams.min_price ?? resolvedSearchParams.minPrice);
  const maxPriceParam = firstString(resolvedSearchParams.max_price ?? resolvedSearchParams.maxPrice);
  const neighborhoodParam = firstString(resolvedSearchParams.neighborhood);
  const instantParam = firstString(
    resolvedSearchParams.instant ?? resolvedSearchParams.isDirectBooking
  );
  const wifiParam = firstString(resolvedSearchParams.wifi ?? resolvedSearchParams.minWifiSpeed);

  let amenitiesList: string[] = [];
  if (Array.isArray(resolvedSearchParams.amenities)) {
    amenitiesList = resolvedSearchParams.amenities;
  } else if (typeof resolvedSearchParams.amenities === 'string') {
    amenitiesList = [resolvedSearchParams.amenities];
  }

  const cityProperties = await listProperties({
    city: location.city,
    moveIn,
    moveOut,
  });

  const minPriceVal = parseFiniteInt(minPriceParam);
  const maxPriceVal = parseFiniteInt(maxPriceParam);

  const initialFilters: FilterState = {
    bedrooms: parseFiniteInt(bedroomsParam),
    minPrice: minPriceVal !== null ? minPriceVal * 100 : null,
    maxPrice: maxPriceVal !== null ? maxPriceVal * 100 : null,
    neighborhood: neighborhoodParam || null,
    amenities: amenitiesList,
    instantBook: instantParam === 'true',
    minWifi: parseFiniteInt(wifiParam),
    moveIn: moveIn || null,
    moveOut: moveOut || null,
  };

  return (
    <Suspense fallback={<CityViewSkeleton />}>
      <CityViewContainer
        city={location}
        allCityProperties={cityProperties}
        initialFilters={initialFilters}
      />
    </Suspense>
  );
}
