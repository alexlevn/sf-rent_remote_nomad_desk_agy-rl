'use client';

import React from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import type { Property, Reservation } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';
import { PaymentStatusPill, ReservationStatusPill } from './reservation-badges';

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]';

export function formatUsdFromCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

// Older rows may lack stored commission/payout; derive from rent like the server does
export function commissionCentsOf(res: Reservation): number {
  return res.commissionAmount ?? Math.round((res.rentAmount || 0) * BOOKING_RULES.commissionRate);
}

function hostPayoutCentsOf(res: Reservation): number {
  return res.hostPayout ?? Math.round((res.rentAmount || 0) * (1 - BOOKING_RULES.commissionRate));
}

interface ReservationAuditModalProps {
  reservation: Reservation;
  property: Property | undefined;
  hostName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onStartVoid: (reservation: Reservation) => void;
}

export function ReservationAuditModal({
  reservation,
  property,
  hostName,
  isSubmitting,
  onClose,
  onStartVoid,
}: ReservationAuditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reservation audit details for #${reservation.code}`}
        className="w-full max-w-xl bg-white max-h-[90vh] rounded-2xl shadow-2xl p-6 overflow-y-auto border border-[var(--color-border-light)] space-y-6"
      >
        <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border-light)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-[var(--color-brand)]">#{reservation.code}</span>
              <ReservationStatusPill status={reservation.status} />
              <PaymentStatusPill paymentStatus={reservation.paymentStatus} />
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-on-light)]">Reservation Audit Details</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reservation details"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="p-4 rounded-xl bg-neutral-50 space-y-2">
            <div className={SECTION_LABEL}>Stay & Property</div>
            <div className="font-semibold text-base text-[var(--color-text-on-light)]">
              {property?.title || `Property #${reservation.propertyId}`}
            </div>
            <div className="text-xs text-[var(--color-text-on-light-muted)]">
              City: {property?.city} · Host: {hostName}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light)] pt-1">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>
                <strong>{reservation.moveInDate}</strong> → <strong>{reservation.moveOutDate}</strong> (
                {reservation.nights} nights)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-neutral-50 space-y-2">
              <div className={SECTION_LABEL}>Guest Information</div>
              <div className="text-sm font-semibold text-[var(--color-text-on-light)]">{reservation.guestName}</div>
              <div className="text-xs text-neutral-500">{reservation.guestEmail}</div>
              {reservation.guestPhone && <div className="text-xs text-neutral-500">Phone: {reservation.guestPhone}</div>}
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 space-y-2">
              <div className={SECTION_LABEL}>Financial Audit</div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Total Charged:</span>
                <strong className="text-[var(--color-text-on-light)]">
                  {formatUsdFromCents(reservation.totalAmount || 0)}
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">NomadDesk 10% Cut:</span>
                <strong className="text-emerald-600">{formatUsdFromCents(commissionCentsOf(reservation))}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Host Net Payout:</span>
                <strong className="text-[var(--color-text-on-light)]">
                  {formatUsdFromCents(hostPayoutCentsOf(reservation))}
                </strong>
              </div>
              {reservation.paymentRef && (
                <div className="text-[11px] text-neutral-400 truncate pt-1">Ref: {reservation.paymentRef}</div>
              )}
            </div>
          </div>

          {reservation.status === 'cancelled' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-1 text-xs">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Cancellation Event Audit
              </div>
              <p>
                Cancelled by: <strong className="uppercase">{reservation.cancelledBy || 'system'}</strong>
              </p>
              {reservation.rejectionReason && <p>Reason: {reservation.rejectionReason}</p>}
              <p className="text-neutral-500 pt-0.5">
                Payment marked as: <strong>{reservation.paymentStatus}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[var(--color-border-light)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            Close
          </button>

          {reservation.status === 'confirmed' && (
            <button
              type="button"
              onClick={() => onStartVoid(reservation)}
              className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
            >
              Admin Void & Refund
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
