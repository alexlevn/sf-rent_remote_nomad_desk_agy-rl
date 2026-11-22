'use client';

import React from 'react';
import { Eye, Mail, Phone } from 'lucide-react';
import type { Property, Reservation } from '@/lib/types';
import { formatUtcDateRange } from '@/lib/format';
import { ReservationStatusBadge } from './reservation-status-badge';

export interface ReservationListProps {
  reservations: Reservation[];
  propertyMap: Map<number, Property>;
  netPercent: number;
  isReadOnly: boolean;
  actionLoadingId: number | null;
  formatPrice: (cents: number) => string;
  getHoursLeft: (reservation: Reservation) => number;
  onAccept: (reservation: Reservation) => void;
  onReject: (reservation: Reservation) => void;
  onDetails: (reservation: Reservation) => void;
}

function hasVisibleContact(res: Reservation): boolean {
  return (res.status === 'confirmed' || res.status === 'completed') && Boolean(res.guestEmail);
}

// Desktop table (>= 768px)
export function ReservationTable({
  reservations,
  propertyMap,
  netPercent,
  isReadOnly,
  actionLoadingId,
  formatPrice,
  getHoursLeft,
  onAccept,
  onReject,
  onDetails,
}: ReservationListProps) {
  return (
    <div className="hidden md:block bg-white rounded-2xl border border-[var(--color-border-light)] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-[var(--color-border-light)] text-neutral-500 font-semibold">
              <th className="py-3.5 px-4">Booking ID</th>
              <th className="py-3.5 px-4">Guest</th>
              <th className="py-3.5 px-4">Property</th>
              <th className="py-3.5 px-4">Stay Dates</th>
              <th className="py-3.5 px-4">Gross Rent</th>
              <th className="py-3.5 px-4">Net Payout ({netPercent}%)</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-light)] text-neutral-800">
            {reservations.map((res) => {
              const property = propertyMap.get(res.propertyId);
              const isBusy = isReadOnly || actionLoadingId === res.id;

              return (
                <tr key={res.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-neutral-900 whitespace-nowrap">{res.code}</td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-neutral-900">{res.guestName}</div>
                    {hasVisibleContact(res) ? (
                      <div className="text-[11px] text-neutral-500 space-y-0.5 mt-0.5">
                        <div className="flex items-center gap-1 text-emerald-700">
                          <Mail className="w-3 h-3" />
                          <span>{res.guestEmail}</span>
                        </div>
                        {res.guestPhone && (
                          <div className="flex items-center gap-1 text-neutral-600">
                            <Phone className="w-3 h-3" />
                            <span>{res.guestPhone}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-400 italic mt-0.5">Contact visible after confirmation</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 max-w-[200px]">
                    <div className="font-medium text-neutral-900 truncate">
                      {property?.title || `Property #${res.propertyId}`}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {property ? [property.neighborhood, property.city].filter(Boolean).join(', ') : ''}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium">{formatUtcDateRange(res.moveInDate, res.moveOutDate)}</div>
                    <div className="text-[11px] text-neutral-500">{res.nights} nights</div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-medium text-neutral-700">
                    {formatPrice(res.rentAmount)}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[var(--color-brand)]">
                    {formatPrice(res.hostPayout)}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <ReservationStatusBadge reservation={res} hoursLeft={getHoursLeft(res)} />
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {res.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onAccept(res)}
                            disabled={isBusy}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                          >
                            {actionLoadingId === res.id ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject(res)}
                            disabled={isBusy}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onDetails(res)}
                        aria-label={`View reservation ${res.code} details`}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Mobile cards (< 768px / 390px)
export function ReservationCards({
  reservations,
  propertyMap,
  netPercent,
  isReadOnly,
  actionLoadingId,
  formatPrice,
  getHoursLeft,
  onAccept,
  onReject,
  onDetails,
}: ReservationListProps) {
  return (
    <div className="md:hidden space-y-3">
      {reservations.map((res) => {
        const property = propertyMap.get(res.propertyId);
        const isBusy = isReadOnly || actionLoadingId === res.id;

        return (
          <div key={res.id} className="bg-white rounded-2xl border border-[var(--color-border-light)] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-sm text-neutral-900">{res.code}</span>
                <p className="text-xs font-semibold text-neutral-700">{res.guestName}</p>
              </div>
              <div>
                <ReservationStatusBadge reservation={res} hoursLeft={getHoursLeft(res)} compact />
              </div>
            </div>

            <div className="text-xs space-y-1 text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
              <p className="font-semibold text-neutral-900 truncate">{property?.title || `Property #${res.propertyId}`}</p>
              <p>
                {formatUtcDateRange(res.moveInDate, res.moveOutDate)} ({res.nights} nights)
              </p>
              <div className="flex justify-between pt-1 border-t border-neutral-200">
                <span>Gross Rent:</span>
                <span className="font-semibold text-neutral-800">{formatPrice(res.rentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Payout ({netPercent}%):</span>
                <span className="font-bold text-[var(--color-brand)]">{formatPrice(res.hostPayout)}</span>
              </div>
            </div>

            {res.rejectionReason && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <strong>Reason:</strong> {res.rejectionReason}
              </div>
            )}

            {hasVisibleContact(res) && (
              <div className="text-xs bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{res.guestEmail}</span>
                </div>
                {res.guestPhone && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{res.guestPhone}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {res.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => onAccept(res)}
                    disabled={isBusy}
                    className="flex-1 min-h-10 text-xs font-semibold rounded-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 text-center"
                  >
                    {actionLoadingId === res.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(res)}
                    disabled={isBusy}
                    className="flex-1 min-h-10 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-center"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => onDetails(res)}
                className="flex-1 min-h-10 text-xs font-semibold rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors text-center"
              >
                Details
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
