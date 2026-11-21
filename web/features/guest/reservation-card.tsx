'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { KeyRound, Wifi, AlertCircle, Calendar, MapPin, UserCheck } from 'lucide-react';
import type { Reservation, Property, HostProfile } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDatesDisplay, getDaysUntilMoveIn } from './guest-utils';

export interface ReservationCardProps {
  reservation: Reservation;
  property: Property | null;
  host: HostProfile | null;
  onViewDetails: (reservation: Reservation) => void;
  onCancelClick: (reservation: Reservation) => void;
}

export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  property,
  host,
  onViewDetails,
  onCancelClick,
}) => {
  const { formatPrice } = useCurrency();

  const isConfirmed = reservation.status === 'confirmed';
  const isPending = reservation.status === 'pending';
  const isRejected = reservation.status === 'rejected';
  const isCompleted = reservation.status === 'completed';

  const daysUntilMoveIn = getDaysUntilMoveIn(reservation.moveInDate);
  const canCancelConfirmed = isConfirmed && daysUntilMoveIn >= 14;
  const isConfirmedLocked = isConfirmed && daysUntilMoveIn < 14;

  const propertyTitle = property?.title || 'Furnished Apartment';
  const propertyCity = property?.city || 'Madrid';
  const propertyImage = property?.images?.[0] || '/seed/property/prop-madrid-1.webp';
  const hostName = host?.displayName || 'Casa Urbana Stays';

  // Smart lock passcode derived deterministically from booking id
  const smartLockPasscode = `${8400 + ((reservation.id * 92) % 1000)}#`;

  // Status badge config
  const renderStatusBadge = () => {
    switch (reservation.status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return (
          <Badge variant="warning" className="animate-pulse">
            Pending {reservation.respondBy ? '(38h left)' : ''}
          </Badge>
        );
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'expired':
        return <Badge variant="neutral">Expired</Badge>;
      default:
        return <Badge variant="neutral">{reservation.status}</Badge>;
    }
  };

  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row gap-5">
      {/* Property Thumbnail */}
      <div className="relative w-full sm:w-44 h-40 sm:h-36 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
        <Image
          src={propertyImage}
          alt={propertyTitle}
          fill
          sizes="(max-width: 640px) 100vw, 176px"
          className="object-cover"
        />
        <div className="absolute top-2 left-2 sm:hidden">{renderStatusBadge()}</div>
      </div>

      {/* Main Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="hidden sm:block">{renderStatusBadge()}</div>
            <span className="text-xs text-[var(--color-text-on-light-muted)] font-mono font-medium">
              Reservation #{reservation.code}
            </span>
          </div>

          <h3 className="text-base font-bold text-[var(--color-text-on-light)] truncate mb-1">
            {property?.slug ? (
              <Link
                href={`/l/apartments/${property.slug}`}
                className="hover:text-[var(--color-brand)] transition-colors"
              >
                {propertyTitle}
              </Link>
            ) : (
              propertyTitle
            )}
          </h3>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[var(--color-text-on-light-muted)] mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              {propertyCity}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {formatDatesDisplay(reservation.moveInDate, reservation.moveOutDate)} (
              {reservation.nights} nights)
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
              Host: {hostName}
            </span>
          </div>

          {/* Rejection notice if rejected */}
          {isRejected && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong>Request Declined:</strong>{' '}
                {reservation.rejectionReason || 'The host was unable to accept this booking.'}
              </div>
            </div>
          )}

          {/* Smart lock passcode snippet ONLY when confirmed */}
          {isConfirmed && (
            <div className="mb-3 py-2 px-3 bg-[#faf8f5] border border-[var(--color-border-light)] rounded-lg text-xs flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-[var(--color-text-on-light)]">
                <KeyRound className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                <strong>Passcode:</strong>{' '}
                <span className="font-mono font-bold text-[var(--color-brand)]">
                  {smartLockPasscode}
                </span>
              </span>
              <span className="text-neutral-300">|</span>
              <span className="flex items-center gap-1.5 text-[var(--color-text-on-light-muted)]">
                <Wifi className="w-3.5 h-3.5 text-neutral-500" />
                WiFi: <span className="font-mono text-neutral-700">NomadDesk-{propertyCity}5G</span>
              </span>
            </div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <div className="pt-3 border-t border-[var(--color-border-light)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs text-[var(--color-text-on-light-muted)] block">Total Paid</span>
            <span className="text-base font-bold text-[var(--color-text-on-light)]">
              {formatPrice(reservation.totalAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(reservation)}
              className="text-xs"
            >
              Receipt & Details
            </Button>

            {/* Cancel Actions */}
            {isPending && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelClick(reservation)}
                className="text-xs text-[var(--color-error)] border-red-200 hover:bg-red-50"
              >
                Cancel Request
              </Button>
            )}

            {canCancelConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelClick(reservation)}
                className="text-xs text-[var(--color-error)] border-red-200 hover:bg-red-50"
              >
                Cancel Stay
              </Button>
            )}

            {isConfirmedLocked && (
              <span className="text-[11px] text-[var(--color-text-on-light-muted)] italic">
                Contact support to change this booking
              </span>
            )}

            {isCompleted && (
              <Button variant="outline" size="sm" disabled className="text-xs opacity-70">
                Review (Soon)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
