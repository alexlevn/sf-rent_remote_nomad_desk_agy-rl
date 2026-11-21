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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const location = await getLocationBySlug(citySlug);

  if (!location) {
    return {
      title: 'City Not Found | NomadDesk',
    };
  }

  const cityName = location.name || location.city;
  const cleanDescription = location.description ? stripHtmlTags(location.description) : '';
  return {
    title: `Furnished Apartments in ${cityName}, ${location.country} | NomadDesk Split View`,
    description:
      cleanDescription ||
      `Browse verified monthly furnished apartments in ${cityName} with dedicated ergonomic workstations and certified high-speed fiber internet for digital nomads.`,
  };
}

function CityViewSkeleton() {
  return (
    <div className="flex flex-col min-h-screen animate-pulse">
      {/* Subheader skeleton */}
      <div className="bg-white border-b border-[var(--color-border-light)] py-4 px-6 h-16 flex items-center justify-between">
        <div className="w-48 h-6 bg-neutral-200 rounded" />
        <div className="flex gap-2">
          <div className="w-24 h-8 bg-neutral-200 rounded-full" />
          <div className="w-24 h-8 bg-neutral-200 rounded-full" />
        </div>
      </div>
      {/* Split view skeleton */}
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

  const moveIn = (resolvedSearchParams.move_in || resolvedSearchParams.moveIn) as string | undefined;
  const moveOut = (resolvedSearchParams.move_out || resolvedSearchParams.moveOut) as string | undefined;
  const bedroomsParam = resolvedSearchParams.bedrooms as string | undefined;
  const minPriceParam = (resolvedSearchParams.min_price || resolvedSearchParams.minPrice) as string | undefined;
  const maxPriceParam = (resolvedSearchParams.max_price || resolvedSearchParams.maxPrice) as string | undefined;
  const neighborhoodParam = resolvedSearchParams.neighborhood as string | undefined;
  const instantParam = (resolvedSearchParams.instant || resolvedSearchParams.isDirectBooking) as string | undefined;
  const wifiParam = (resolvedSearchParams.wifi || resolvedSearchParams.minWifiSpeed) as string | undefined;

  let amenitiesList: string[] = [];
  if (Array.isArray(resolvedSearchParams.amenities)) {
    amenitiesList = resolvedSearchParams.amenities as string[];
  } else if (typeof resolvedSearchParams.amenities === 'string') {
    amenitiesList = [resolvedSearchParams.amenities];
  }

  // Fetch properties for this city respecting move_in and move_out (AC-LIST-5)
  // and only published properties of approved hosts (AC-LIST-6)
  const cityProperties = await listProperties({
    city: location.city,
    moveIn,
    moveOut,
  });

  const initialFilters: FilterState = {
    bedrooms: bedroomsParam ? parseInt(bedroomsParam, 10) : null,
    minPrice: minPriceParam ? parseInt(minPriceParam, 10) * 100 : null,
    maxPrice: maxPriceParam ? parseInt(maxPriceParam, 10) * 100 : null,
    neighborhood: neighborhoodParam || null,
    amenities: amenitiesList,
    instantBook: instantParam === 'true',
    minWifi: wifiParam ? parseInt(wifiParam, 10) : null,
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
