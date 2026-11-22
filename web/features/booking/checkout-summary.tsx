'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Calendar, Laptop, ShieldAlert } from 'lucide-react';
import type { Property, HostProfile, CreateReservationInput, PricingBreakdown } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOOKING_RULES } from '@/content/booking-rules';
import { formatUtcDateRange, normalizeImageSrc } from '@/lib/format';
import { GuestInfoForm, type GuestInfo } from './guest-info-form';
import { MockPaymentCard, type PaymentDetails } from './mock-payment-card';

export interface CheckoutBookingAction {
  (input: CreateReservationInput): Promise<{
    success: boolean;
    code?: string;
    error?: string;
    isCollision?: boolean;
  }>;
}

interface CheckoutSummaryProps {
  property: Property;
  host: HostProfile | null;
  moveIn: string;
  moveOut: string;
  nights: number;
  workstationType: string;
  workstationLabel: string;
  pricing: PricingBreakdown;
  isSubmitting: boolean;
  disabledBooking?: boolean;
  error: string | null;
  isCollision?: boolean;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  property,
  host,
  moveIn,
  moveOut,
  nights,
  workstationType,
  workstationLabel,
  pricing,
  isSubmitting,
  disabledBooking = false,
  error,
  isCollision = false,
}) => {
  const { formatPrice } = useCurrency();

  const isProWorkstation = workstationType === 'pro' || workstationType === 'upgrade';
  const isDirectBooking = property.isDirectBooking;
  const hostDisplayName = host?.displayName || 'Verified NomadDesk Host';
  const primaryImage = normalizeImageSrc(property.images?.[0]);

  return (
    <div className="w-full lg:w-[380px] shrink-0">
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-md sticky top-6">
        {/* Apartment Header */}
        <div className="flex gap-4 mb-4 pb-4 border-b border-neutral-100">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
            <Image
              src={primaryImage}
              alt={property.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--color-text-on-light-muted)] truncate mb-0.5">
              {property.city}
              {property.country ? `, ${property.country}` : ''}
            </div>
            <h3 className="font-bold text-sm text-[var(--color-text-on-light)] leading-snug line-clamp-2 mb-1.5">
              {property.title}
            </h3>
            <Badge
              variant="accent"
              className="text-[10px] font-medium bg-[var(--color-brand-light)] text-[var(--color-brand)] border-0"
            >
              Host: {hostDisplayName}
            </Badge>
          </div>
        </div>

        {/* Stay Parameters */}
        <div className="space-y-2.5 py-3 border-b border-neutral-100 text-xs">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-[var(--color-text-on-light-muted)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              Dates:
            </span>
            <span className="font-semibold text-[var(--color-text-on-light)] text-right">
              {formatUtcDateRange(moveIn, moveOut)} ({nights} nights)
            </span>
          </div>

          <div className="flex justify-between items-baseline gap-2">
            <span className="text-[var(--color-text-on-light-muted)] flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-neutral-400" />
              Workstation:
            </span>
            <span className="font-semibold text-[var(--color-text-on-light)] text-right">
              {workstationLabel}
            </span>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="py-4 space-y-2 text-xs sm:text-sm border-b border-neutral-100">
          <div className="flex justify-between text-[var(--color-text-on-light)]">
            <span className="text-[var(--color-text-on-light-muted)]">
              Rent ({nights} nights)
            </span>
            <span className="font-medium">
              {formatPrice(pricing.rentAmountUSD, { showCents: true })}
            </span>
          </div>

          <div className="flex justify-between text-[var(--color-text-on-light)]">
            <span className="text-[var(--color-text-on-light-muted)]">
              Workstation {isProWorkstation ? 'Pro Upgrade' : 'Setup'}
            </span>
            <span className="font-medium">
              {pricing.workstationFeeUSD > 0
                ? formatPrice(pricing.workstationFeeUSD, { showCents: true })
                : 'Included'}
            </span>
          </div>

          <div className="flex justify-between text-[var(--color-text-on-light-muted)] text-xs">
            <span>NomadDesk Platform Fee ({BOOKING_RULES.commissionPercent}%)</span>
            <span className="font-medium text-[var(--color-success)]">Included</span>
          </div>

          {/* Total Row */}
          <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-neutral-100">
            <span className="font-bold text-sm sm:text-base text-[var(--color-text-on-light)]">
              {isDirectBooking ? 'Total Amount' : 'Total Authorization'}
            </span>
            <span className="font-bold text-xl sm:text-2xl text-[var(--color-brand)]">
              {formatPrice(pricing.totalAmountUSD, { showCents: true })}
            </span>
          </div>
        </div>

        {/* Error / Collision Notice */}
        {error && (
          <div
            role="alert"
            data-testid="checkout-error-alert"
            className="my-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error-text)] transition-all"
          >
            {isCollision ? (
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-error)]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-error)]" />
            )}
            <div className="space-y-1">
              <strong className="font-bold block">
                {isCollision ? 'Dates Unavailable' : 'Booking Error'}
              </strong>
              <p className="leading-relaxed">{error}</p>
              {isCollision && (
                <div className="space-y-1 pt-0.5">
                  <p className="text-[11px] opacity-90">Your card was NOT charged.</p>
                  <Link
                    href={`/l/apartments/${property.slug}`}
                    className="inline-block font-semibold underline text-[var(--color-error)]"
                  >
                    Choose different dates →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit CTA Button */}
        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            pill
            isLoading={isSubmitting}
            disabled={disabledBooking || isSubmitting}
            data-testid="checkout-submit-btn"
            className="w-full font-bold text-sm sm:text-base py-3.5 flex items-center justify-center gap-2"
          >
            <span>{isDirectBooking ? 'Confirm & Pay' : 'Send request'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Subtext below CTA */}
          <p className="text-center text-[11px] text-[var(--color-text-on-light-muted)] mt-2.5 leading-relaxed">
            {isDirectBooking ? (
              <span>Instant booking — your reservation is immediately confirmed.</span>
            ) : (
              <span>You won&apos;t be charged until the host accepts.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

interface CheckoutFormContainerProps {
  property: Property;
  host: HostProfile | null;
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  moveIn: string;
  moveOut: string;
  nights: number;
  workstationType: string;
  workstationLabel: string;
  workstationEURCents: number;
  pricing: PricingBreakdown;
  disabledBooking?: boolean;
  createBookingAction: CheckoutBookingAction;
}

export const CheckoutFormContainer: React.FC<CheckoutFormContainerProps> = ({
  property,
  host,
  currentUser,
  moveIn,
  moveOut,
  nights,
  workstationType,
  workstationLabel,
  workstationEURCents,
  pricing,
  disabledBooking = false,
  createBookingAction,
}) => {
  const router = useRouter();
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    phone: '+1 (555) 234-5678',
  });

  const [payment, setPayment] = useState<PaymentDetails>({
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/28',
    cvc: '123',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollision, setIsCollision] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleGuestFieldChange = useCallback((field: keyof GuestInfo, val: string) => {
    setGuestInfo((prev) => ({ ...prev, [field]: val }));
  }, []);

  const handlePaymentFieldChange = useCallback((field: keyof PaymentDetails, val: string) => {
    setPayment((prev) => ({ ...prev, [field]: val }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || disabledBooking) return;

    if (!guestInfo.firstName.trim() || !guestInfo.email.trim()) {
      setError('Please provide your name and email address.');
      setIsCollision(false);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    setIsCollision(false);

    let willRedirect = false;
    try {
      const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
      const bookingResult = await createBookingAction({
        propertyId: property.id,
        moveInDate: moveIn,
        moveOutDate: moveOut,
        guestName: fullName,
        guestEmail: guestInfo.email.trim(),
        guestPhone: guestInfo.phone.trim(),
        workstationMonthlyEUR: workstationEURCents,
        workstationConfig: {
          packageId: workstationType,
          customMonthlyPriceEUR: workstationEURCents,
        },
      });

      if (bookingResult.success && bookingResult.code) {
        willRedirect = true;
        router.push(`/booking/confirmation?code=${encodeURIComponent(bookingResult.code)}`);
        return;
      }

      setError(bookingResult.error || 'Failed to complete reservation.');
      setIsCollision(Boolean(bookingResult.isCollision));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      setIsCollision(
        msg.toLowerCase().includes('booked') ||
          msg.toLowerCase().includes('blocked') ||
          msg.toLowerCase().includes('collision')
      );
    } finally {
      if (!willRedirect) {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
      <div className="flex-1 w-full min-w-0">
        <GuestInfoForm
          info={guestInfo}
          onChange={handleGuestFieldChange}
          disabled={isSubmitting || disabledBooking}
        />

        <MockPaymentCard
          payment={payment}
          onChange={handlePaymentFieldChange}
          isDirectBooking={property.isDirectBooking}
          hostName={host?.displayName || 'Verified NomadDesk Host'}
          disabled={isSubmitting || disabledBooking}
        />
      </div>

      <CheckoutSummary
        property={property}
        host={host}
        moveIn={moveIn}
        moveOut={moveOut}
        nights={nights}
        workstationType={workstationType}
        workstationLabel={workstationLabel}
        pricing={pricing}
        isSubmitting={isSubmitting}
        disabledBooking={disabledBooking}
        error={error}
        isCollision={isCollision}
      />
    </form>
  );
};
