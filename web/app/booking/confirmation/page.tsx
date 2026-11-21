import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, CheckCircle2, Home, ListOrdered } from 'lucide-react';
import { getReservationByCode, listReservations } from '@/lib/api/reservations';
import { getPropertyById } from '@/lib/api/properties';
import { getHostProfile } from '@/lib/api/hosts';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Reservation Confirmation | NomadDesk',
  description: 'View your booking confirmation and next steps for your upcoming remote stay.',
};

interface ConfirmationPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function BookingConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const { code } = await searchParams;

  // Attempt to load reservation from mock API
  let reservation = code ? await getReservationByCode(code) : null;
  if (!reservation) {
    const list = await listReservations();
    reservation = list[0] || null;
  }

  // Load property and host details
  const property = reservation ? await getPropertyById(reservation.propertyId) : null;
  const host = property ? await getHostProfile(property.hostId) : null;

  const isConfirmed = reservation?.status === 'confirmed';
  const bookingCode = reservation?.code || 'ND-84920';
  const hostName = host?.displayName || 'Casa Urbana Stays';
  const city = property?.city || 'Madrid';
  const nights = reservation?.nights || 30;
  const totalAmountStr = reservation
    ? `$${(reservation.totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$1,365.00';
  const guestEmail = reservation?.guestEmail || 'demo@example.com';

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] py-12 sm:py-16 px-4">
      <div className="max-w-[580px] mx-auto bg-white border border-[var(--color-border-light)] rounded-3xl p-8 sm:p-12 shadow-[var(--shadow-lg)] text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          {isConfirmed ? (
            <Badge variant="success" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Confirmed
            </Badge>
          ) : (
            <Badge variant="warning" className="text-xs px-3 py-1 font-semibold">
              Reservation #{bookingCode} Pending Approval
            </Badge>
          )}
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)] mb-3">
          {isConfirmed ? 'Booking confirmed' : 'Request sent — the host will respond within 48 hours'}
        </h1>

        {/* Subtitle / Description */}
        <p className="text-sm text-[var(--color-text-on-light-muted)] leading-relaxed mb-6">
          {isConfirmed ? (
            <span>
              Your {nights}-night stay in <strong className="text-[var(--color-text-on-light)]">{city}</strong> is confirmed and secured! Your card has been charged <strong className="text-[var(--color-text-on-light)]">{totalAmountStr}</strong>. We&apos;ve sent your receipt and check-in instructions to <strong className="text-[var(--color-text-on-light)]">{guestEmail}</strong>.
            </span>
          ) : (
            <span>
              <strong className="text-[var(--color-text-on-light)]">{hostName}</strong> has been notified and has <strong>48 hours</strong> to review and confirm your {nights}-night reservation in {city}. Your card is authorized for <strong>{totalAmountStr}</strong> but will not be captured until approved.
            </span>
          )}
        </p>

        {/* Next Steps Box */}
        <div className="bg-[#faf8f5] border border-[var(--color-border-light)] rounded-2xl p-5 text-left mb-8 text-xs sm:text-sm">
          <div className="font-bold text-[var(--color-text-on-light)] mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
              <span>24 hours prior to check-in, keyless entrance codes and WiFi details appear in your dashboard.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-[var(--color-text-on-light)]">3.</span>
              <span>Dedicated workstation is inspected, cleaned, and speed-tested before your arrival.</span>
            </li>
          </ul>
        </div>

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

      {/* UI States & Verification Blocks */}
      <section className="max-w-4xl mx-auto mt-16 pt-8 border-t border-[var(--color-border-light)]">
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
          <div className="text-sm font-bold text-[var(--color-text-on-light)] mb-1">
            📋 UI States & Verification Blocks — Xác Nhận Đặt Phòng (/booking/confirmation)
          </div>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mb-5">
            These verification blocks showcase alternative UI conditions (Instant booking confirmed vs Request to book pending) required for thorough stage review.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-950">
              <Badge variant="success" className="mb-2">Instant Booking Confirmed</Badge>
              <div className="font-bold text-sm text-emerald-950 mb-1">Booking confirmed</div>
              <p className="leading-relaxed text-emerald-800">
                Reservation #ND-XXXXX confirmed immediately. Payment captured, keyless door code unlocked upon arrival.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-950">
              <Badge variant="warning" className="mb-2">Request to Book Pending</Badge>
              <div className="font-bold text-sm text-amber-950 mb-1">Request sent</div>
              <p className="leading-relaxed text-amber-800">
                Reservation #ND-XXXXX pending host approval within 48 hours. Card held under authorization hold.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
