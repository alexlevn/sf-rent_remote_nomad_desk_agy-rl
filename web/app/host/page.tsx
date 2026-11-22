import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireHost } from '@/lib/auth/guards';
import { getHostPortalContext, redactUnconfirmedReservation } from '@/lib/auth/host-page';
import { listProperties } from '@/lib/api/properties';
import { listReservations, updateReservationStatus } from '@/lib/api/reservations';
import { MS_PER_HOUR, getUtcOffsetDateString, toUtcDateString } from '@/lib/format';
import type { Property } from '@/lib/types';
import { DashboardKpis } from '@/features/host/dashboard-kpis';
import {
  RequestsTable,
  type PendingRequestItem,
  type UpcomingCheckInItem,
} from '@/features/host/requests-table';

export const metadata: Metadata = {
  title: 'Host Dashboard & Operations | NomadDesk Host Portal',
  description:
    'Overview of your furnished apartment portfolio performance, pending 48h booking inquiries, and upcoming guest check-ins.',
  robots: { index: false, follow: false },
};

export default async function HostDashboardPage() {
  const { host, isReadOnly } = await getHostPortalContext('/host');

  const [properties, rawReservations] = await Promise.all([
    listProperties({ hostId: host.id, status: 'all' }),
    listReservations({ hostId: host.id }),
  ]);

  const reservations = rawReservations.map(redactUnconfirmedReservation);

  const propertyMap = new Map<number, Property>();
  properties.forEach((p) => propertyMap.set(p.id, p));

  // Compute KPI: Live published listings (no synthetic fallback)
  const liveListingsCount = properties.filter((p) => p.status === 'published').length;

  // Compute pending requests with real respondBy - Date.now() countdown
  const nowMs = Date.now();
  const pendingRaw = reservations.filter((r) => r.status === 'pending');
  const pendingRequests: PendingRequestItem[] = pendingRaw.map((r) => {
    let hoursRemaining = 0;
    if (r.respondBy) {
      const diffMs = new Date(r.respondBy).getTime() - nowMs;
      hoursRemaining = Math.max(0, Math.ceil(diffMs / MS_PER_HOUR));
    }
    return {
      reservation: r,
      property: propertyMap.get(r.propertyId) || null,
      hoursRemaining,
    };
  });

  // Upcoming confirmed check-ins in the next 30 days (UTC)
  const todayIso = toUtcDateString(new Date(nowMs));
  const in30DaysIso = getUtcOffsetDateString(30);
  const upcomingRaw = reservations
    .filter(
      (r) =>
        r.status === 'confirmed' &&
        r.moveInDate >= todayIso &&
        r.moveInDate <= in30DaysIso
    )
    .sort((a, b) => a.moveInDate.localeCompare(b.moveInDate));

  const upcomingCheckIns: UpcomingCheckInItem[] = upcomingRaw.map((r) => ({
    reservation: r,
    property: propertyMap.get(r.propertyId) || null,
  }));

  // Expected net payout for active confirmed/completed stays starting or active this month
  const currentMonthPrefix = todayIso.slice(0, 7);
  const expectedNetPayoutCents = reservations
    .filter(
      (r) =>
        (r.status === 'confirmed' || r.status === 'completed') &&
        r.moveInDate.startsWith(currentMonthPrefix)
    )
    .reduce((sum, r) => sum + (r.hostPayout || 0), 0);

  async function acceptReservationAction(reservationId: number) {
    'use server';
    try {
      const { hostId } = await requireHost();
      await updateReservationStatus(reservationId, 'confirmed', undefined, undefined, { hostId });
      revalidatePath('/host');
      revalidatePath('/host/reservations');
      revalidatePath('/host/calendar');
      revalidatePath('/host/payouts');
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to accept booking request.',
      };
    }
  }

  async function rejectReservationAction(reservationId: number, reason?: string) {
    'use server';
    try {
      const { hostId } = await requireHost();
      await updateReservationStatus(reservationId, 'rejected', reason, 'host', { hostId });
      revalidatePath('/host');
      revalidatePath('/host/reservations');
      revalidatePath('/host/calendar');
      revalidatePath('/host/payouts');
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reject booking request.',
      };
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border-light)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Welcome back, {host.displayName}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Portfolio overview for {host.cities || 'your properties'} • Partner status:{' '}
            <span
              className={`font-semibold uppercase ${
                host.status === 'suspended' ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {host.status}
            </span>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <DashboardKpis
        liveListingsCount={liveListingsCount}
        pendingRequestsCount={pendingRequests.length}
        upcomingCheckInsCount={upcomingCheckIns.length}
        expectedNetPayoutCents={expectedNetPayoutCents}
      />

      {/* Requests Table & Upcoming Check-Ins */}
      <RequestsTable
        initialRequests={pendingRequests}
        upcomingCheckIns={upcomingCheckIns}
        isReadOnly={isReadOnly}
        onAcceptAction={acceptReservationAction}
        onRejectAction={rejectReservationAction}
      />
    </div>
  );
}
