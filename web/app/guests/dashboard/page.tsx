import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, Heart, KeyRound, ShieldCheck, Wifi } from 'lucide-react';
import { listReservations } from '@/lib/api/reservations';
import { getPropertyById } from '@/lib/api/properties';
import { getStrictSessionUser } from '@/lib/auth/session';
import { listUserFavoriteIds } from '@/lib/api/favorites';
import {
  getSmartLockPasscode,
  getUtcOffsetDateString,
  normalizeImageSrc,
} from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { GuestSubnav } from '@/features/guest/guest-subnav';
import { formatDatesDisplay } from '@/features/guest/guest-utils';

export const metadata: Metadata = {
  title: 'Guest Dashboard | NomadDesk',
  description: 'Manage your active nomad bookings, check-in instructions, and smart lock credentials.',
  robots: { index: false, follow: false },
};

export default async function GuestDashboardPage() {
  const user = await getStrictSessionUser();
  if (!user || !user.isActive) {
    redirect('/login?callbackUrl=/guests/dashboard');
  }

  const [reservations, favoriteIds] = await Promise.all([
    listReservations({ userId: user.id }),
    listUserFavoriteIds(user.id),
  ]);

  const confirmedReservations = reservations.filter((r) => r.status === 'confirmed');
  const pendingReservations = reservations.filter((r) => r.status === 'pending');

  const confirmedCount = confirmedReservations.length;
  const pendingCount = pendingReservations.length;
  const savedCount = favoriteIds.length;

  // Pick the earliest upcoming/active confirmed reservation (never fall back to already-past stays)
  const todayUtc = getUtcOffsetDateString(0);
  const upcomingStay =
    [...confirmedReservations]
      .filter((r) => r.moveOutDate >= todayUtc)
      .sort((a, b) => a.moveInDate.localeCompare(b.moveInDate))[0] || null;

  const property = upcomingStay ? await getPropertyById(upcomingStay.propertyId) : null;
  const smartLockPasscode = upcomingStay ? getSmartLockPasscode(upcomingStay.id) : '';
  const propertyCity = property?.city || 'City';

  return (
    <div className="w-full bg-[var(--color-bg-light)] min-h-[calc(100vh-160px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Topbar: Welcome & Quick Action Links */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)] tracking-tight">
              Welcome back, {user.firstName || 'Guest'}!
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mt-1">
              Manage your active nomad bookings and smart lock credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {user.role === 'host' ? (
              <Link
                href="/host"
                className="inline-flex items-center px-3.5 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)] transition-colors"
              >
                Switch to Hosting →
              </Link>
            ) : user.role === 'admin' ? (
              <Link
                href="/admin"
                className="inline-flex items-center px-3.5 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)] transition-colors"
              >
                Admin Portal →
              </Link>
            ) : (
              <Link
                href="/partner-network"
                className="inline-flex items-center px-3.5 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)] transition-colors"
              >
                Become a Host →
              </Link>
            )}
            <Link
              href="/guests/favorites"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)] transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>Saved ({savedCount})</span>
            </Link>
          </div>
        </div>

        {/* Subnavigation Bar */}
        <GuestSubnav
          activeCount={{
            bookings: reservations.length,
            favorites: savedCount,
          }}
        />

        {/* Active KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider block mb-1">
              Confirmed Stays
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-brand)]">
              {confirmedCount}
            </div>
            <span className="text-[11px] text-[var(--color-text-light-subtle)] mt-1 block">
              Active stays booked
            </span>
          </div>

          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider block mb-1">
              Pending Requests
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)]">
              {pendingCount}
            </div>
            <span className="text-[11px] text-[var(--color-text-light-subtle)] mt-1 block">
              Awaiting host response
            </span>
          </div>

          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider block mb-1">
              Saved Homes
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)]">
              {savedCount}
            </div>
            <span className="text-[11px] text-[var(--color-text-light-subtle)] mt-1 block">
              Bookmarked for future trips
            </span>
          </div>

          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider block mb-1">
              Account Status
            </span>
            <div className="text-base sm:text-lg font-bold text-[var(--color-success)] flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-5 h-5 text-[var(--color-success)]" />
              Verified Guest
            </div>
            <span className="text-[11px] text-[var(--color-text-light-subtle)] mt-1 block">
              Identity &amp; card verified
            </span>
          </div>
        </div>

        {/* Upcoming Stay Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-on-light)]">
              Upcoming Stay
            </h2>
            <Link
              href="/guests/reservations"
              className="text-xs text-[var(--color-brand)] font-semibold hover:underline flex items-center gap-1"
            >
              View all bookings ({reservations.length}) →
            </Link>
          </div>

          {upcomingStay && property ? (
            <div className="bg-white border border-[var(--color-border-light)] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row gap-6 items-start">
              <div className="relative w-full md:w-64 h-48 sm:h-44 rounded-2xl overflow-hidden shrink-0 bg-neutral-100">
                <Image
                  src={normalizeImageSrc(property.images?.[0])}
                  alt={property.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 256px"
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <Badge variant="success">Confirmed</Badge>
                  <span className="text-xs text-[var(--color-text-on-light-muted)] font-mono">
                    Reservation #{upcomingStay.code}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
                  <Link
                    href={`/l/apartments/${property.slug}`}
                    className="hover:text-[var(--color-brand)] transition-colors"
                  >
                    {property.title}
                  </Link>
                </h3>

                <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-4">
                  Move-in: {formatDatesDisplay(upcomingStay.moveInDate, upcomingStay.moveOutDate)} (
                  {upcomingStay.nights} nights)
                </p>

                {/* Smart Lock and WiFi Credentials box (ONLY visible for confirmed stay) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[var(--color-bg-light-subtle)] border border-[var(--color-border-light)] rounded-2xl text-xs mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[var(--color-brand-light)] text-[var(--color-brand)] rounded-lg">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[var(--color-text-on-light-muted)] block text-[11px]">
                        Smart Lock Passcode
                      </span>
                      <span className="font-mono font-bold text-sm text-[var(--color-brand)]">
                        {smartLockPasscode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)] rounded-lg">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[var(--color-text-on-light-muted)] block text-[11px]">
                        WiFi Network
                      </span>
                      <span className="font-mono font-bold text-xs text-[var(--color-text-on-light)]">
                        NomadDesk-{propertyCity}5G
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-3">
                  <Link
                    href="/guests/reservations"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)] transition-colors"
                  >
                    Manage Reservation &amp; Receipt
                  </Link>
                  <Link
                    href={`/l/apartments/${property.slug}`}
                    className="text-xs text-[var(--color-brand)] font-medium hover:underline"
                  >
                    View Apartment Page
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[var(--color-border-light)] rounded-3xl p-8 sm:p-10 text-center max-w-lg mx-auto shadow-xs">
              <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-1">
                No upcoming confirmed stay
              </h3>
              <p className="text-xs text-[var(--color-text-on-light-muted)] mb-5">
                Ready for your next remote working adventure? Explore curated apartments with fiber
                internet and ergonomic setups.
              </p>
              <Link
                href="/c/furnished-apartments-madrid"
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Browse Apartments
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
