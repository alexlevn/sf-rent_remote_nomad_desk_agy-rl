'use client';

import React from 'react';
import { KeyRound, Mail, Monitor, Phone, X } from 'lucide-react';
import type { Property, Reservation } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';
import { formatUtcDateRange, getSmartLockPasscode } from '@/lib/format';
import { ReservationStatusBadge } from './reservation-status-badge';

interface ReservationDetailDrawerProps {
  reservation: Reservation;
  property: Property | undefined;
  hoursLeft: number;
  isReadOnly: boolean;
  isActionLoading: boolean;
  formatPrice: (cents: number) => string;
  onClose: () => void;
  onAccept: (reservation: Reservation) => void;
  onReject: (reservation: Reservation) => void;
}

export function ReservationDetailDrawer({
  reservation,
  property,
  hoursLeft,
  isReadOnly,
  isActionLoading,
  formatPrice,
  onClose,
  onAccept,
  onReject,
}: ReservationDetailDrawerProps) {
  const showContact =
    (reservation.status === 'confirmed' || reservation.status === 'completed') && Boolean(reservation.guestEmail);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-res-detail-title"
      className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between gap-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--color-border-light)]">
            <div>
              <span className="text-xs font-mono text-neutral-500">{reservation.code}</span>
              <h3 id="host-res-detail-title" className="text-lg font-bold text-neutral-900">
                Reservation Details
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reservation details"
              className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase">Status</span>
            <ReservationStatusBadge reservation={reservation} hoursLeft={hoursLeft} />
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
            <div className="font-bold text-neutral-900 text-sm">{property?.title || `Property #${reservation.propertyId}`}</div>
            <div className="text-neutral-600">
              {formatUtcDateRange(reservation.moveInDate, reservation.moveOutDate)} • {reservation.nights} nights
            </div>
            {reservation.status === 'confirmed' && (
              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  Smart Lock Code
                </span>
                <span className="font-mono font-bold text-neutral-900">{getSmartLockPasscode(reservation.id)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-neutral-500">Guest</div>
            <div className="font-semibold text-sm text-neutral-900">{reservation.guestName}</div>
            {showContact ? (
              <div className="space-y-1 text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{reservation.guestEmail}</span>
                </div>
                {reservation.guestPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{reservation.guestPhone}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-neutral-400 italic">Guest contact details unlock once the reservation is confirmed.</p>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span>Workstation Setup</span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-700">
              {reservation.workstationConfig?.packageId
                ? `Selected package: ${reservation.workstationConfig.packageId}`
                : reservation.workstationFee > 0
                  ? `Custom workstation upgrade (+${formatPrice(reservation.workstationFee)})`
                  : 'Standard Comfort Base (Included)'}
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-[var(--color-border-light)] pt-4">
            <div className="flex justify-between">
              <span className="text-neutral-500">Gross Rent</span>
              <span className="font-medium text-neutral-900">{formatPrice(reservation.rentAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Platform Commission ({BOOKING_RULES.commissionPercent}%)</span>
              <span className="font-medium text-red-600">-{formatPrice(reservation.commissionAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-200">
              <span className="text-neutral-900">Net Host Payout</span>
              <span className="text-[var(--color-brand)]">{formatPrice(reservation.hostPayout)}</span>
            </div>
          </div>

          {reservation.rejectionReason && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              <strong className="block mb-0.5">Decline / Cancellation Reason:</strong>
              {reservation.rejectionReason}
            </div>
          )}
        </div>

        {reservation.status === 'pending' && !isReadOnly && (
          <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border-light)]">
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => onAccept(reservation)}
              className="flex-1 min-h-10 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Accepting...' : 'Accept Request'}
            </button>
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => onReject(reservation)}
              className="flex-1 min-h-10 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
