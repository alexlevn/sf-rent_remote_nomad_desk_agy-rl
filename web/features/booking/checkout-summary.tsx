'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Calendar, Laptop, ShieldAlert } from 'lucide-react';
import type { Property, HostProfile, CreateReservationInput, PricingBreakdown } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  pricing: PricingBreakdown;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
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
  pricing,
  onSubmit,
  isSubmitting,
  error,
  isCollision = false,
}) => {
  const { formatPrice } = useCurrency();

  // Format dates for display (e.g. Dec 1, 2026 – Dec 31, 2026 (30 nights))
  const formatDateRange = (inDate: string, outDate: string, countNights: number) => {
    try {
      const dIn = new Date(inDate + 'T00:00:00');
      const dOut = new Date(outDate + 'T00:00:00');
      if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) {
        return `${inDate} – ${outDate} (${countNights} nights)`;
      }
      const inStr = dIn.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const outStr = dOut.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${inStr} – ${outStr} (${countNights} nights)`;
    } catch {
      return `${inDate} – ${outDate} (${countNights} nights)`;
    }
  };

  const isProWorkstation = workstationType === 'pro' || workstationType === 'upgrade';
  const isDirectBooking = property.isDirectBooking;
  const hostDisplayName = host?.displayName || 'Casa Urbana Stays';
  const primaryImage =
    property.images && property.images.length > 0
      ? property.images[0]
      : '/seed/property/prop-madrid-1.webp';

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
              {property.city}, {property.country || 'Spain'}
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
              {formatDateRange(moveIn, moveOut, nights)}
            </span>
          </div>

          <div className="flex justify-between items-baseline gap-2">
            <span className="text-[var(--color-text-on-light-muted)] flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-neutral-400" />
              Workstation:
            </span>
            <span className="font-semibold text-[var(--color-text-on-light)]">
              {isProWorkstation ? 'Pro Upgrade (+€150)' : 'Comfort Base (Included)'}
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
            <span>NomadDesk Platform Fee (10%)</span>
            <span className="font-medium text-emerald-600">Included</span>
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
            className="my-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-900 transition-all"
          >
            {isCollision ? (
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            )}
            <div className="space-y-0.5">
              <strong className="font-bold block">
                {isCollision ? 'Dates Just Reserved' : 'Booking Error'}
              </strong>
              <p className="leading-relaxed">{error}</p>
              {isCollision && (
                <p className="text-[11px] text-red-700 mt-1">
                  Another nomad confirmed this apartment 2 minutes ago. Your card was NOT charged.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit CTA Button */}
        <div className="pt-4">
          <Button
            type="button"
            onClick={onSubmit}
            variant="primary"
            size="lg"
            pill
            isLoading={isSubmitting}
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
              <span>&ldquo;You won&apos;t be charged until the host accepts&rdquo;</span>
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
  moveIn: string;
  moveOut: string;
  nights: number;
  workstationType: string;
  workstationEURCents: number;
  pricing: PricingBreakdown;
  createBookingAction: CheckoutBookingAction;
}

export const CheckoutFormContainer: React.FC<CheckoutFormContainerProps> = ({
  property,
  host,
  moveIn,
  moveOut,
  nights,
  workstationType,
  workstationEURCents,
  pricing,
  createBookingAction,
}) => {
  const router = useRouter();
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: 'Alex',
    lastName: 'Le',
    email: 'demo@example.com',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!guestInfo.firstName.trim() || !guestInfo.email.trim()) {
      setError('Please provide your name and email address.');
      setIsCollision(false);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    setIsCollision(false);

    try {
      const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
      const res = await createBookingAction({
        propertyId: property.id,
        moveInDate: moveIn,
        moveOutDate: moveOut,
        guestName: fullName,
        guestEmail: guestInfo.email.trim(),
        guestPhone: guestInfo.phone.trim(),
        workstationMonthlyEUR: workstationEURCents,
      });

      if (res.success && res.code) {
        router.push(`/booking/confirmation?code=${encodeURIComponent(res.code)}`);
        return;
      }

      setError(res.error || 'Failed to complete reservation.');
      setIsCollision(Boolean(res.isCollision));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      setIsCollision(
        msg.toLowerCase().includes('booked') ||
          msg.toLowerCase().includes('blocked') ||
          msg.toLowerCase().includes('collision')
      );
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
      {/* Left Column: Forms */}
      <div className="flex-1 w-full min-w-0">
        <GuestInfoForm
          info={guestInfo}
          onChange={(field, val) =>
            setGuestInfo((prev) => ({
              ...prev,
              [field]: val,
            }))
          }
          disabled={isSubmitting}
        />

        <MockPaymentCard
          payment={payment}
          onChange={(field, val) =>
            setPayment((prev) => ({
              ...prev,
              [field]: val,
            }))
          }
          isDirectBooking={property.isDirectBooking}
          hostName={host?.displayName || 'Casa Urbana Stays'}
          disabled={isSubmitting}
        />
      </div>

      {/* Right Column: Sticky Summary Card */}
      <CheckoutSummary
        property={property}
        host={host}
        moveIn={moveIn}
        moveOut={moveOut}
        nights={nights}
        workstationType={workstationType}
        pricing={pricing}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={error}
        isCollision={isCollision}
      />
    </form>
  );
};
