import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle, Check, CheckCircle2, Clock, Home, ListOrdered } from 'lucide-react';
import { getReservationByCode } from '@/lib/api/reservations';
import { getPropertyById } from '@/lib/api/properties';
import { getHostProfile } from '@/lib/api/hosts';
import { getStrictSessionUser } from '@/lib/auth/session';
import { BOOKING_RULES } from '@/content/booking-rules';
import { Badge } from '@/components/ui/badge';
import { FormattedPrice } from '@/features/booking/formatted-price';

export const metadata: Metadata = {
  title: 'Reservation Confirmation | NomadDesk',
  description: 'View your booking confirmation and next steps for your upcoming remote stay.',
  robots: { index: false, follow: false },
};

interface ConfirmationPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function BookingConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const { code } = await searchParams;

  const currentUser = await getStrictSessionUser();
  if (!currentUser || !currentUser.isActive) {
    const callbackUrl = code
      ? `/booking/confirmation?code=${encodeURIComponent(code)}`
      : '/booking/confirmation';
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const reservation = code ? await getReservationByCode(code) : null;
  const hasAccess =
    reservation &&
    (reservation.userId === currentUser.id || currentUser.role === 'admin');

  if (!reservation || !hasAccess) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] py-12 sm:py-16 px-4">
        <div className="max-w-[540px] mx-auto bg-white border border-[var(--color-border-light)] rounded-3xl p-8 sm:p-12 shadow-[var(--shadow-lg)] text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-error-bg)] text-[var(--color-error)] flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mb-2">
            Reservation not found
          </h1>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mb-8">
            We couldn&apos;t locate that reservation under your account. Check your bookings list
            to view all confirmed and pending stays.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/guests/reservations"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-brand)] text-white font-semibold text-sm hover:bg-[var(--color-brand-hover)] transition-colors"
            >
              <ListOrdered className="w-4 h-4" />
              <span>Go to My Reservations</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] font-semibold text-sm hover:bg-neutral-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const property = await getPropertyById(reservation.propertyId);
  const host = property ? await getHostProfile(property.hostId) : null;

  const status = reservation.status;
  const isConfirmed = status === 'confirmed' || status === 'completed';
  const isPending = status === 'pending';
  const bookingCode = reservation.code;
  const hostName = host?.displayName || 'Your Host';
  const city = property?.city || 'your destination';
  const nights = reservation.nights;
  const respondHours = reservation.respondHours ?? BOOKING_RULES.respondHours;

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] py-12 sm:py-16 px-4">
      <div className="max-w-[580px] mx-auto bg-white border border-[var(--color-border-light)] rounded-3xl p-8 sm:p-12 shadow-[var(--shadow-lg)] text-center">
        {/* Status Icon */}
        {isConfirmed ? (
          <div className="w-16 h-16 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>
        ) : isPending ? (
          <div className="w-16 h-16 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--color-error-bg)] text-[var(--color-error)] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
        )}

        {/* Status Badge */}
        <div className="mb-3">
          {status === 'confirmed' && (
            <Badge variant="success" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Confirmed
            </Badge>
          )}
          {status === 'completed' && (
            <Badge variant="neutral" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Completed
            </Badge>
          )}
          {status === 'pending' && (
            <Badge variant="warning" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Pending Approval
            </Badge>
          )}
          {status === 'rejected' && (
            <Badge variant="error" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Declined
            </Badge>
          )}
          {status === 'cancelled' && (
            <Badge variant="neutral" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Cancelled
            </Badge>
          )}
          {status === 'expired' && (
            <Badge variant="neutral" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Expired
            </Badge>
          )}
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mb-3">
          {status === 'confirmed' && 'Booking confirmed'}
          {status === 'completed' && 'Stay completed'}
          {status === 'pending' && `Request sent — the host will respond within ${respondHours} hours`}
          {status === 'rejected' && 'Booking request declined'}
          {status === 'cancelled' && 'Reservation cancelled'}
          {status === 'expired' && 'Booking request expired'}
        </h1>

        {/* Subtitle / Description */}
        <p className="text-sm text-[var(--color-text-on-light-muted)] leading-relaxed mb-6">
          {isConfirmed ? (
            <span>
              Your {nights}-night stay in{' '}
              <strong className="text-[var(--color-text-on-light)]">{city}</strong> is confirmed and
              secured! Your card has been charged{' '}
              <strong className="text-[var(--color-text-on-light)]">
                <FormattedPrice amountUSDCents={reservation.totalAmount} showCents />
              </strong>
              . We&apos;ve sent your receipt and check-in instructions to{' '}
              <strong className="text-[var(--color-text-on-light)]">
                {reservation.guestEmail}
              </strong>
              .
            </span>
          ) : isPending ? (
            <span>
              <strong className="text-[var(--color-text-on-light)]">{hostName}</strong> has been
              notified and has <strong>{respondHours} hours</strong> to review and confirm your{' '}
              {nights}-night reservation in {city}. Your card is authorized for{' '}
              <strong>
                <FormattedPrice amountUSDCents={reservation.totalAmount} showCents />
              </strong>{' '}
              but will not be captured until approved.
            </span>
          ) : (
            <span>
              This reservation ({nights} nights in {city}) is currently marked{' '}
              <strong className="capitalize text-[var(--color-text-on-light)]">{status}</strong>.
              Payment status:{' '}
              <strong className="capitalize text-[var(--color-text-on-light)]">
                {reservation.paymentStatus}
              </strong>
              .
            </span>
          )}
        </p>

        {/* Next Steps Box */}
        {(isConfirmed || isPending) && (
          <div className="bg-[var(--color-bg-light-subtle)] border border-[var(--color-border-light)] rounded-2xl p-5 text-left mb-8 text-xs sm:text-sm">
            <div className="font-bold text-[var(--color-text-on-light)] mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
              <span>What happens next?</span>
            </div>
            <ul className="text-[var(--color-text-on-light-muted)] space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[var(--color-text-on-light)]">1.</span>
                <span>
                  {isConfirmed
                    ? 'Booking is marked Confirmed and payment has been captured.'
                    : 'Host reviews and accepts request → Reservation marked Confirmed.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[var(--color-text-on-light)]">2.</span>
                <span>
                  24 hours prior to check-in, keyless entrance codes and WiFi details appear in your
                  dashboard.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[var(--color-text-on-light)]">3.</span>
                <span>
                  Dedicated workstation is inspected, cleaned, and speed-tested before your arrival.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/guests/reservations"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-brand)] text-white font-semibold text-sm hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm"
          >
            <ListOrdered className="w-4 h-4" />
            <span>Go to My Reservations</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] font-semibold text-sm hover:bg-neutral-50 transition-colors"
          >
            <Home className="w-4 h-4 text-neutral-500" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
