import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listReservations } from '@/lib/api/reservations';
import { listPropertiesByIds } from '@/lib/api/properties';
import { listHostsByIds } from '@/lib/api/hosts';
import { getStrictSessionUser } from '@/lib/auth/session';
import { listUserFavoriteIds } from '@/lib/api/favorites';
import type { Property, HostProfile } from '@/lib/types';
import { GuestSubnav } from '@/features/guest/guest-subnav';
import { ReservationsView } from '@/features/guest/reservations-view';

export const metadata: Metadata = {
  title: 'My Reservations | NomadDesk',
  description: 'Manage your active nomad bookings, check-in instructions, and download receipts.',
  robots: { index: false, follow: false },
};

export default async function GuestReservationsPage() {
  const user = await getStrictSessionUser();
  if (!user || !user.isActive) {
    redirect('/login?callbackUrl=/guests/reservations');
  }

  const [reservations, favoriteIds] = await Promise.all([
    listReservations({ userId: user.id }),
    listUserFavoriteIds(user.id),
  ]);

  const propertyIds = Array.from(new Set(reservations.map((r) => r.propertyId)));
  const propertiesList = await listPropertiesByIds(propertyIds);
  const propertiesMap: Record<number, Property> = {};
  propertiesList.forEach((p) => {
    propertiesMap[p.id] = p;
  });

  const hostIds = Array.from(new Set(propertiesList.map((p) => p.hostId)));
  const hostsList = await listHostsByIds(hostIds);
  const hostsMap: Record<number, HostProfile> = {};
  hostsList.forEach((h) => {
    hostsMap[h.id] = h;
  });

  return (
    <div className="w-full bg-[var(--color-bg-light)] min-h-[calc(100vh-160px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)] tracking-tight">
            My Stays &amp; Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mt-1">
            Review status, download receipts, or cancel eligible reservations.
          </p>
        </div>

        <GuestSubnav
          activeCount={{
            bookings: reservations.length,
            favorites: favoriteIds.length,
          }}
        />

        <ReservationsView
          initialReservations={reservations}
          propertiesMap={propertiesMap}
          hostsMap={hostsMap}
        />
      </div>
    </div>
  );
}
