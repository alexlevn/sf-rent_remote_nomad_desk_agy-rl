'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, CheckCircle2, KeyRound, User } from 'lucide-react';
import type { Property, Reservation } from '@/lib/types';
import { getSmartLockPasscode } from '@/lib/format';

export interface UpcomingCheckInItem {
  reservation: Reservation;
  property: Property | null;
}

export function UpcomingCheckIns({ upcoming }: { upcoming: UpcomingCheckInItem[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <span>📅 Upcoming Check-Ins</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
            Next 30 Days
          </span>
        </h2>
        <Link
          href="/host/calendar"
          className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1"
        >
          <span>View Full Calendar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 mb-1">
            No check-ins in the next 30 days
          </h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            Your confirmed guest stays will show up here along with check-in instructions and smart lock access codes.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-[var(--color-border-light)] text-xs uppercase font-semibold tracking-wider text-neutral-500">
                <th className="py-3.5 px-4 sm:px-6">Guest</th>
                <th className="py-3.5 px-4 sm:px-6">Property</th>
                <th className="py-3.5 px-4 sm:px-6">Check-In Date</th>
                <th className="py-3.5 px-4 sm:px-6">Duration</th>
                <th className="py-3.5 px-4 sm:px-6">Smart Lock</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {upcoming.map((item) => {
                const r = item.reservation;
                const p = item.property;

                return (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-4 px-4 sm:px-6 align-middle">
                      <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{r.guestName}</span>
                      </div>
                      {r.guestEmail && (
                        <div className="text-xs text-neutral-400">{r.guestEmail}</div>
                      )}
                    </td>

                    <td className="py-4 px-4 sm:px-6 align-middle">
                      <div className="font-medium text-neutral-900 max-w-xs truncate">
                        {p?.title || `Apartment #${r.propertyId}`}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {p ? [p.neighborhood, p.city].filter(Boolean).join(', ') : ''}
                      </div>
                    </td>

                    <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap font-medium text-neutral-800">
                      {r.moveInDate}
                    </td>

                    <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap text-neutral-600">
                      {r.nights} nights
                    </td>

                    <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                        <KeyRound className="w-3 h-3 text-neutral-500" />
                        <span>{getSmartLockPasscode(r.id)}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confirmed</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
