import React from 'react';
import type { Metadata } from 'next';
import { listUserFavoriteProperties } from '@/lib/api/favorites';
import { listReservations } from '@/lib/api/reservations';
import { getCurrentUser } from '@/lib/auth/session';
import { GuestSubnav } from '@/features/guest/guest-subnav';
import { FavoritesView } from '@/features/guest/favorites-view';

export const metadata: Metadata = {
  title: 'Saved Apartments | NomadDesk',
  description: 'View and manage residences you have bookmarked for upcoming nomadic stints.',
  robots: { index: false, follow: false },
};

export default async function GuestFavoritesPage() {
  const user = await getCurrentUser();
  const favoriteProperties = await listUserFavoriteProperties(user.id);
  const reservations = await listReservations({ userId: user.id });

  return (
    <div className="w-full bg-[var(--color-bg-light)] min-h-[calc(100vh-160px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Subnavigation Bar */}
        <GuestSubnav
          activeCount={{
            bookings: reservations.length,
            favorites: favoriteProperties.length,
          }}
        />

        {/* Favorites View */}
        <FavoritesView
          initialProperties={favoriteProperties}
          userId={user.id}
        />
      </div>
    </div>
  );
}
