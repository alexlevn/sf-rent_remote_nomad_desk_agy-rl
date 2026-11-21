'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { useCurrency } from '@/context/currency-context';

export interface PayoutHistoryRow {
  id: number;
  date: string;
  bookingCode: string;
  guestName: string;
  propertyTitle: string;
  grossRentCents: number;
  commissionCents: number;
  netDisbursedCents: number;
  status: 'cleared' | 'scheduled' | 'processing';
  month: string;
}

const INITIAL_ROWS: PayoutHistoryRow[] = [
  {
    id: 1,
    date: 'Nov 15, 2026',
    bookingCode: '#ND-73910',
    guestName: 'Elena Rostova',
    propertyTitle: 'Curated 3-br Sky Home, Jerónimos',
    grossRentCents: 120000, // $1,200
    commissionCents: 12000, // -$120
    netDisbursedCents: 108000, // $1,080
    status: 'cleared',
    month: 'November 2026',
  },
  {
    id: 2,
    date: 'Oct 15, 2026',
    bookingCode: '#ND-68421',
    guestName: 'Lucas Dubois',
    propertyTitle: 'Retiro Park View Studio',
    grossRentCents: 180000, // $1,800
    commissionCents: 18000, // -$180
    netDisbursedCents: 162000, // $1,620
    status: 'cleared',
    month: 'October 2026',
  },
  {
    id: 3,
    date: 'Sep 15, 2026',
    bookingCode: '#ND-51902',
    guestName: 'Aria Takahashi',
    propertyTitle: 'Barcelona Modernist Loft',
    grossRentCents: 240000, // $2,400
    commissionCents: 24000, // -$240
    netDisbursedCents: 216000, // $2,160
    status: 'cleared',
    month: 'September 2026',
  },
  {
    id: 4,
    date: 'Dec 15, 2026',
    bookingCode: '#ND-SEED2',
    guestName: 'Demo User',
    propertyTitle: 'Retiro Park View Studio',
    grossRentCents: 240000, // $2,400
    commissionCents: 24000, // -$240
    netDisbursedCents: 216000, // $2,160
    status: 'scheduled',
    month: 'December 2026',
  },
];

export default function HostPayoutsPage() {
  const { formatPrice } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [rows] = useState<PayoutHistoryRow[]>(INITIAL_ROWS);

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (selectedMonth === 'all') return true;
    return r.month.toLowerCase() === selectedMonth.toLowerCase();
  });

  // KPI Calculations
  const lifetimeEarningsCents = 2845000; // $28,450 matching design
  const nextPayoutCents = 216000; // $2,160 matching design

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Earnings & Disbursements (P1)
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Review your gross rental earnings, 10% platform commission deductions, and monthly bank disbursement statements.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1: Lifetime Earnings */}
        <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-6 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Total Lifetime Earnings
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-[var(--color-brand)]">
            {formatPrice(lifetimeEarningsCents)}
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            All-time net funds disbursed to your registered bank account
          </div>
        </div>

        {/* KPI 2: Next Payout */}
        <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-6 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Next Payout (Dec 15)
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-neutral-900">
            {formatPrice(nextPayoutCents)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Scheduled for automatic transfer • Bank wire transfer</span>
          </div>
        </div>
      </div>

      {/* Payouts Table Container */}
      <div className="space-y-4">
        {/* Subheader with Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-neutral-900">
              Disbursement History
            </h3>
            <span className="text-xs text-neutral-500">
              ({filteredRows.length} statement{filteredRows.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Month:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold border border-[var(--color-border-light)] rounded-lg px-3 py-1.5 bg-white text-neutral-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            >
              <option value="all">All Months</option>
              <option value="December 2026">December 2026 (Upcoming)</option>
              <option value="November 2026">November 2026</option>
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {filteredRows.length === 0 ? (
          <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center shadow-xs">
            <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-neutral-800">
              No disbursements for this period
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Select &quot;All Months&quot; to see historical payments.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-[var(--color-border-light)] text-xs uppercase font-semibold tracking-wider text-neutral-500">
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4 sm:px-6">Booking</th>
                  <th className="py-3.5 px-4 sm:px-6">Gross</th>
                  <th className="py-3.5 px-4 sm:px-6">Commission (10%)</th>
                  <th className="py-3.5 px-4 sm:px-6">Net Disbursed</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    {/* Date */}
                    <td className="py-4 px-4 sm:px-6 align-middle font-medium text-neutral-800 whitespace-nowrap">
                      {row.date}
                    </td>

                    {/* Booking */}
                    <td className="py-4 px-4 sm:px-6 align-middle">
                      <div className="font-semibold text-neutral-900 font-mono text-xs">
                        {row.bookingCode}
                      </div>
                      <div className="text-xs text-neutral-400 truncate max-w-xs">
                        {row.propertyTitle}
                      </div>
                    </td>

                    {/* Gross */}
                    <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap font-medium text-neutral-700">
                      {formatPrice(row.grossRentCents)}
                    </td>

                    {/* Commission */}
                    <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap text-xs text-red-600 font-medium">
                      -{formatPrice(row.commissionCents)}
                    </td>

                    {/* Net Disbursed */}
                    <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap">
                      <span className="font-bold text-[var(--color-brand)] text-base">
                        {formatPrice(row.netDisbursedCents)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                      {row.status === 'cleared' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Cleared</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explainer Note (D21) */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-xs text-neutral-600 leading-relaxed">
        <div className="font-semibold text-neutral-800 mb-1 flex items-center gap-1.5">
          <ArrowDownRight className="w-4 h-4 text-[var(--color-brand)]" />
          <span>NomadDesk Settlement Policy (D18, D21)</span>
        </div>
        Disbursements are released on the 15th of each month for active bookings. NomadDesk retains a flat 10% platform commission on the monthly rent to cover tenant vetting, card processing fees, and marketing exposure. Workstation upgrade packages provided directly by NomadDesk are billed separately without impacting your apartment rental rate.
      </div>
    </div>
  );
}
