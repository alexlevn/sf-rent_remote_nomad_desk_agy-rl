import type { Metadata } from 'next';
import { listLocations } from '@/lib/api/locations';
import { listProperties } from '@/lib/api/properties';
import { listVideos } from '@/lib/api/videos';
import { listTravelGuides } from '@/lib/api/guides';
import { HeroSearch } from '@/features/home/hero-search';
import { FeaturedApartments } from '@/features/home/featured-apartments';
import { TopCities } from '@/features/home/top-cities';
import { Showcase3D } from '@/features/home/showcase-3d';
import { WorkstationStrip } from '@/features/home/workstation-strip';
import { CommunityReels } from '@/features/home/community-reels';
import { GuideHighlights } from '@/features/home/guide-highlights';
import { HomeFAQ } from '@/features/home/home-faq';
import { UIStateShowcase } from '@/features/home/ui-state-showcase';

export const metadata: Metadata = {
  title: 'NomadDesk — Furnished Apartments with Ergonomic Workstations for Monthly Rent',
  description:
    'Curated monthly furnished apartments equipped with dual 4K monitors, ergonomic executive seating, and verified high-speed fiber internet for digital nomads.',
};

export default async function HomePage() {
  const [locations, properties, videos, guides] = await Promise.all([
    listLocations(),
    listProperties({ featured: true }),
    listVideos(),
    listTravelGuides({ featured: true }),
  ]);

  // Fallback to general list if featured query returned fewer than 3
  const displayProperties =
    properties.length >= 3 ? properties : await listProperties();

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Search Box */}
      <HeroSearch locations={locations} />

      {/* 2. Featured Apartments Grid */}
      <FeaturedApartments properties={displayProperties} />

      {/* 3. Top Cities for Remote Work */}
      <TopCities locations={locations} />

      {/* 4. 3D Stay Showcase & Process */}
      <Showcase3D />

      {/* 5. Workstation Upgrade Banner */}
      <WorkstationStrip />

      {/* 6. Community Video Reels */}
      <CommunityReels videos={videos} />

      {/* 7. Travel Guides Highlights */}
      <GuideHighlights guides={guides} />

      {/* 8. FAQs Accordion */}
      <HomeFAQ />

      {/* 9. UI States & Verification Showcase */}
      <UIStateShowcase />
    </div>
  );
}
