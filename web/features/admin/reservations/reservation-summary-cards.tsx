import React from 'react';
import type { AdminReservationsSummary } from '@/lib/api/reservations';

// KPI audit summary (SQL-aggregated across all reservations, not just the current page)
export function ReservationSummaryCards({ summary }: { summary: AdminReservationsSummary }) {
  const gmvUSD = summary.gmvCents / 100;
  const commissionUSD = summary.commissionCents / 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl bg-white border border-[var(--color-border-light)] shadow-sm">
        <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
          Total Bookings
        </div>
        <div className="text-2xl font-bold text-[var(--color-text-on-light)] mt-1">
          {summary.totalCount}
        </div>
        <div className="text-xs text-neutral-400 mt-1">
          {summary.confirmedCount} confirmed · {summary.pendingCount} pending
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[var(--color-border-light)] shadow-sm">
        <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
          Active Stay Pipeline
        </div>
        <div className="text-2xl font-bold text-emerald-600 mt-1">
          {summary.confirmedCount} Stays
        </div>
        <div className="text-xs text-neutral-400 mt-1">
          {summary.cancelledCount} cancellations
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[var(--color-border-light)] shadow-sm">
        <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
          Confirmed GMV
        </div>
        <div className="text-2xl font-bold text-[var(--color-text-on-light)] mt-1">
          ${Math.round(gmvUSD).toLocaleString('en-US')}
        </div>
        <div className="text-xs text-neutral-400 mt-1">
          Platform gross rental volume
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[var(--color-border-light)] shadow-sm">
        <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
          Platform Commission (10%)
        </div>
        <div className="text-2xl font-bold text-[var(--color-brand)] mt-1">
          ${Math.round(commissionUSD).toLocaleString('en-US')}
        </div>
        <div className="text-xs text-neutral-400 mt-1">
          Net NomadDesk platform revenue
        </div>
      </div>
    </div>
  );
}
