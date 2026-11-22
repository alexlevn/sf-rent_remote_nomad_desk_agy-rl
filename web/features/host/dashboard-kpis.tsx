'use client';

import React from 'react';
import { useCurrency } from '@/context/currency-context';
import { BOOKING_RULES } from '@/content/booking-rules';

export interface DashboardKpisProps {
  liveListingsCount: number;
  pendingRequestsCount: number;
  upcomingCheckInsCount: number;
  expectedNetPayoutCents: number;
}

export const DashboardKpis: React.FC<DashboardKpisProps> = ({
  liveListingsCount,
  pendingRequestsCount,
  upcomingCheckInsCount,
  expectedNetPayoutCents,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Live Listings */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          Live Published Listings
        </div>
        <div className="text-3xl font-bold text-[var(--color-brand)]">
          {liveListingsCount}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          Ready for guest instant bookings
        </div>
      </div>

      {/* 2. Pending Requests */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          Pending Requests
        </div>
        <div className="text-3xl font-bold text-neutral-900">
          {pendingRequestsCount}
        </div>
        <div className="mt-1 text-xs text-amber-600 font-medium">
          {pendingRequestsCount > 0
            ? `Requires action within ${BOOKING_RULES.respondHours}h`
            : 'All caught up'}
        </div>
      </div>

      {/* 3. Upcoming Check-Ins */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          Upcoming Check-Ins (30d)
        </div>
        <div className="text-3xl font-bold text-neutral-900">
          {upcomingCheckInsCount}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          Confirmed guest arrivals
        </div>
      </div>

      {/* 4. Expected Net Payout */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          Expected Net Payout (This Month)
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-emerald-700">
          {formatPrice(expectedNetPayoutCents)}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          Net after {BOOKING_RULES.commissionPercent}% platform commission
        </div>
      </div>
    </div>
  );
};
