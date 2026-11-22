import type { Metadata } from 'next';
import { listLocations } from '@/lib/api/locations';
import { listProperties } from '@/lib/api/properties';
import { listVideos } from '@/lib/api/videos';
import { listTravelGuides } from '@/lib/api/guides';
import { getUtcOffsetDateString } from '@/lib/format';
import { BOOKING_RULES } from '@/content/booking-rules';
import { HeroSearch } from '@/features/home/hero-search';
import { FeaturedApartments } from '@/features/home/featured-apartments';
import { TopCities } from '@/features/home/top-cities';
import { Showcase3D } from '@/features/home/showcase-3d';
import { WorkstationStrip } from '@/features/home/workstation-strip';
import { CommunityReels } from '@/features/home/community-reels';
import { GuideHighlights } from '@/features/home/guide-highlights';
import { HomeFAQ } from '@/features/home/home-faq';

const DEFAULT_HERO_MOVE_IN_OFFSET_DAYS = 14;

export const metadata: Metadata = {
  title: 'NomadDesk — Furnished Apartments with Ergonomic Workstations for Monthly Rent',
  description:
    'Curated monthly furnished apartments equipped with dual 4K monitors, ergonomic executive seating, and verified high-speed fiber internet for digital nomads.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'NomadDesk — Furnished Apartments with Ergonomic Workstations for Monthly Rent',
    description:
      'Curated monthly furnished apartments equipped with dual 4K monitors, ergonomic executive seating, and verified high-speed fiber internet for digital nomads.',
    url: '/',
    type: 'website',
  },
};

export default async function HomePage() {
  const [locations, featuredProperties, allProperties, videos, featuredGuides, allGuides] =
    await Promise.all([
      listLocations(),
      listProperties({ featured: true }),
      listProperties(),
      listVideos(),
      listTravelGuides({ featured: true }),
      listTravelGuides(),
    ]);

  // Preserve Admin featuredPosition ordering at index 0 (AC-CMS-4); append non-featured only to fill grid
  const featuredIds = new Set(featuredProperties.map((p) => p.id));
  const displayProperties =
    featuredProperties.length >= 3
      ? featuredProperties
      : [
          ...featuredProperties,
          ...allProperties.filter((p) => !featuredIds.has(p.id)),
        ];

  const displayGuides =
    featuredGuides.length > 0 ? featuredGuides : allGuides.slice(0, 3);

  const defaultMoveIn = getUtcOffsetDateString(DEFAULT_HERO_MOVE_IN_OFFSET_DAYS);
  const defaultMoveOut = getUtcOffsetDateString(
    DEFAULT_HERO_MOVE_IN_OFFSET_DAYS + BOOKING_RULES.minimumStayNights
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Search Box */}
      <HeroSearch
        locations={locations}
        defaultMoveIn={defaultMoveIn}
        defaultMoveOut={defaultMoveOut}
      />

      {/* 2. Featured Apartments Grid */}
      <FeaturedApartments properties={displayProperties} />

      {/* 3. Top Cities for Remote Work */}
      <TopCities locations={locations} />

      {/* 4. 3D Stay Showcase & Process */}
      <Showcase3D property={displayProperties[0]} />

      {/* 5. Workstation Upgrade Banner */}
      <WorkstationStrip />

      {/* 6. Community Video Reels */}
      <CommunityReels videos={videos} />

      {/* 7. Travel Guides Highlights */}
      <GuideHighlights guides={displayGuides} />

      {/* 8. FAQs Accordion */}
      <HomeFAQ />
    </div>
  );
}
