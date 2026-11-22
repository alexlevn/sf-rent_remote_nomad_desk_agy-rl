import React from 'react';
import type { Metadata } from 'next';
import { getHostPortalContext } from '@/lib/auth/host-page';
import { listProperties } from '@/lib/api/properties';
import { listReservations } from '@/lib/api/reservations';
import { formatUtcDate, parseUtcDate, toUtcDateString } from '@/lib/format';
import {
  HostPayoutsView,
  type PayoutHistoryRow,
} from '@/features/host/host-payouts-view';

export const metadata: Metadata = {
  title: 'Earnings & Payouts | NomadDesk Host Portal',
  description: 'View host gross rental earnings, platform commissions, and payout statements.',
  robots: { index: false, follow: false },
};

function getMonthLabel(dateStr: string): string {
  const parsed = parseUtcDate(dateStr);
  if (!parsed) return dateStr.slice(0, 7);
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function HostPayoutsPage() {
  const { host } = await getHostPortalContext('/host/payouts');

  const [properties, reservations] = await Promise.all([
    listProperties({ hostId: host.id, status: 'all' }),
    listReservations({ hostId: host.id }),
  ]);

  const propertyTitleById = new Map(properties.map((p) => [p.id, p.title]));
  const todayIso = toUtcDateString(new Date());

  const settledReservations = reservations
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .sort((a, b) => b.moveInDate.localeCompare(a.moveInDate));

  const rows: PayoutHistoryRow[] = settledReservations.map((r) => {
    const isCleared = r.status === 'completed' || r.moveInDate <= todayIso;
    return {
      id: r.id,
      date: formatUtcDate(r.moveInDate),
      bookingCode: r.code,
      guestName: r.guestName,
      propertyTitle: propertyTitleById.get(r.propertyId) || `Property #${r.propertyId}`,
      grossRentCents: r.rentAmount,
      commissionCents: r.commissionAmount,
      netDisbursedCents: r.hostPayout,
      status: isCleared ? 'cleared' : 'scheduled',
      month: getMonthLabel(r.moveInDate),
    };
  });

  const lifetimeEarningsCents = rows.reduce((sum, r) => sum + r.netDisbursedCents, 0);
  const scheduledRows = rows.filter((r) => r.status === 'scheduled');
  const nextPayoutCents = scheduledRows.reduce((sum, r) => sum + r.netDisbursedCents, 0);
  const nextPayoutLabel =
    scheduledRows.length > 0
      ? scheduledRows[scheduledRows.length - 1].date
      : 'Upcoming';

  return (
    <HostPayoutsView
      rows={rows}
      lifetimeEarningsCents={lifetimeEarningsCents}
      nextPayoutCents={nextPayoutCents}
      nextPayoutLabel={nextPayoutLabel}
    />
  );
}
