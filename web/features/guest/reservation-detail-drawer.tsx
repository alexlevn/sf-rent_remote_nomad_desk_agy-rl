'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Printer,
  X,
  KeyRound,
  Calendar,
  MapPin,
  Laptop,
  CreditCard,
  AlertCircle,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import type { Reservation, Property, HostProfile } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDatesDisplay, getDaysUntilMoveIn } from './guest-utils';

export interface ReservationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  property: Property | null;
  host: HostProfile | null;
  onCancelClick?: (reservation: Reservation) => void;
}

export const ReservationDetailDrawer: React.FC<ReservationDetailDrawerProps> = ({
  isOpen,
  onClose,
  reservation,
  property,
  host,
  onCancelClick,
}) => {
  const { formatPrice } = useCurrency();

  if (!isOpen || !reservation) return null;

  const isConfirmed = reservation.status === 'confirmed';
  const isPending = reservation.status === 'pending';
  const isRejected = reservation.status === 'rejected';
  const isCancelled = reservation.status === 'cancelled';

  const daysUntilMoveIn = getDaysUntilMoveIn(reservation.moveInDate);
  const canCancelConfirmed = isConfirmed && daysUntilMoveIn >= 14;
  const isConfirmedLocked = isConfirmed && daysUntilMoveIn < 14;
  const isCancellable = isPending || canCancelConfirmed;

  const propertyTitle = property?.title || 'Furnished Apartment';
  const propertyCity = property?.city || 'Madrid';
  const propertyImage = property?.images?.[0] || '/seed/property/prop-madrid-1.webp';
  const hostName = host?.displayName || 'Casa Urbana Stays';
  const smartLockPasscode = `${8400 + ((reservation.id * 92) % 1000)}#`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer Card */}
      <div className="relative w-full max-w-2xl bg-white border border-[var(--color-border-light)] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] mb-6">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                Booking Details
              </span>
              <h2
                id="drawer-title"
                className="text-xl sm:text-2xl font-bold text-[var(--color-text-on-light)]"
              >
                Reservation #{reservation.code}
              </h2>
            </div>
            {isConfirmed && <Badge variant="success">Confirmed</Badge>}
            {isPending && <Badge variant="warning">Pending Review</Badge>}
            {isRejected && <Badge variant="error">Rejected</Badge>}
            {isCancelled && <Badge variant="neutral">Cancelled</Badge>}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6">
          {/* Property Summary */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#faf8f5] border border-[var(--color-border-light)]">
            <div className="relative w-full sm:w-32 h-28 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-200">
              <Image
                src={propertyImage}
                alt={propertyTitle}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-[var(--color-brand)] uppercase tracking-wider">
                {propertyCity}
              </span>
              <h3 className="text-base font-bold text-[var(--color-text-on-light)] line-clamp-2">
                {propertyTitle}
              </h3>
              <p className="text-xs text-[var(--color-text-on-light-muted)] mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {property?.address || `${propertyCity}, City Center`}
              </p>
              {property?.slug && (
                <Link
                  href={`/l/apartments/${property.slug}`}
                  target="_blank"
                  className="text-xs text-[var(--color-brand)] font-medium hover:underline inline-block mt-1"
                >
                  View public listing →
                </Link>
              )}
            </div>
          </div>

          {/* Stay Dates & Host Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--color-border-light)] bg-white">
              <span className="text-xs text-[var(--color-text-on-light-muted)] block mb-1">
                Duration & Dates
              </span>
              <div className="text-sm font-semibold text-[var(--color-text-on-light)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--color-brand)]" />
                {formatDatesDisplay(reservation.moveInDate, reservation.moveOutDate)}
              </div>
              <span className="text-xs text-neutral-500 mt-1 block">
                Total: {reservation.nights} nights
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[var(--color-border-light)] bg-white">
              <span className="text-xs text-[var(--color-text-on-light-muted)] block mb-1">
                Host Information
              </span>
              <div className="text-sm font-semibold text-[var(--color-text-on-light)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {hostName}
              </div>
              <span className="text-xs text-neutral-500 mt-1 block">
                Verified Partner · {host?.portfolioSize ? `${host.portfolioSize} properties` : 'Host Partner'}
              </span>
            </div>
          </div>

          {/* Check-in & Smart Lock Credentials (ONLY visible when CONFIRMED) */}
          {isConfirmed && (
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-emerald-700" />
                <h4 className="text-sm font-bold text-emerald-900">
                  Confirmed Check-in & Access Credentials
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-neutral-500 block mb-0.5">Smart Lock Passcode</span>
                  <span className="font-mono text-base font-bold text-[var(--color-brand)]">
                    {smartLockPasscode}
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Enter code followed by # at the front keypad.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-neutral-500 block mb-0.5">High-Speed WiFi</span>
                  <span className="font-mono text-sm font-bold text-neutral-800 block">
                    SSID: NomadDesk-{propertyCity}5G
                  </span>
                  <span className="font-mono text-xs text-neutral-600">
                    Pass: nomad-{reservation.code.toLowerCase()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-emerald-800 mt-3 italic">
                Check-in begins at 3:00 PM on move-in day. Digital smart lock access activates automatically.
              </p>
            </div>
          )}

          {/* Rejection notice if REJECTED */}
          {isRejected && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <Ban className="w-4 h-4 text-red-600" />
                Booking Request Declined by Host
              </div>
              <p>
                <strong>Reason provided:</strong>{' '}
                {reservation.rejectionReason || 'Host could not accommodate the requested dates.'}
              </p>
              <p className="text-red-700">
                Your payment authorization was automatically released. No charges have been deducted from your account.
              </p>
            </div>
          )}

          {/* Cancellation notice if CANCELLED */}
          {isCancelled && (
            <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                <AlertCircle className="w-4 h-4 text-neutral-600" />
                Reservation Cancelled
              </div>
              <p>
                This reservation was cancelled by <strong>{reservation.cancelledBy || 'guest'}</strong>.
              </p>
              <p className="text-neutral-600">
                Payment status: <strong>Refunded</strong> (Ref: {reservation.paymentRef}).
              </p>
            </div>
          )}

          {/* Workstation Specification */}
          <div className="p-4 rounded-xl border border-[var(--color-border-light)] bg-white">
            <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider block mb-2">
              Workstation Specification
            </span>
            <div className="flex items-start gap-3 text-xs">
              <div className="p-2 rounded-lg bg-orange-50 text-[var(--color-brand)] shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-on-light)]">
                  Ergonomic Remote Workstation Setup
                </p>
                <p className="text-[var(--color-text-on-light-muted)] mt-0.5">
                  High-speed Fiber ({property?.workstation?.wifiSpeed || 600} Mbps) · Electric Standing Desk · Ergonomic Chair · External Monitor
                </p>
              </div>
            </div>
          </div>

          {/* Price Breakdown / Receipt Table */}
          <div className="border border-[var(--color-border-light)] rounded-2xl p-4 sm:p-5 bg-white">
            <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider block mb-3">
              Payment & Price Breakdown
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--color-text-on-light-muted)]">
                <span>Monthly Base Rent</span>
                <span>{formatPrice(reservation.rentAmount)}</span>
              </div>
              {reservation.workstationFee > 0 && (
                <div className="flex justify-between text-[var(--color-text-on-light-muted)]">
                  <span>Workstation Hardware Setup Fee</span>
                  <span>{formatPrice(reservation.workstationFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--color-text-on-light-muted)]">
                <span>Platform Service & Nomad Protection</span>
                <span>Included (0%)</span>
              </div>
              <div className="pt-2 border-t border-[var(--color-border-light)] flex justify-between text-sm font-bold text-[var(--color-text-on-light)]">
                <span>Total Amount</span>
                <span>{formatPrice(reservation.totalAmount)}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1 font-mono">
                  <CreditCard className="w-3 h-3" />
                  Ref: {reservation.paymentRef}
                </span>
                <span className="uppercase font-semibold">
                  Status: {reservation.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-[var(--color-border-light)] flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </Button>

          <div className="flex items-center gap-2">
            {isCancellable && onCancelClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onCancelClick(reservation);
                }}
                className="text-xs text-[var(--color-error)] border-red-200 hover:bg-red-50"
              >
                Cancel Reservation
              </Button>
            )}

            {isConfirmedLocked && (
              <span className="text-[11px] text-[var(--color-text-on-light-muted)] italic">
                Contact support to change this booking
              </span>
            )}

            <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
