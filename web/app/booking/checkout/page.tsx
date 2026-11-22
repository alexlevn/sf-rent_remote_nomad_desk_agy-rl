import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { getPropertyById } from '@/lib/api/properties';
import { getHostByUserId, getHostProfile } from '@/lib/api/hosts';
import { createReservation } from '@/lib/api/reservations';
import { getExchangeRates } from '@/lib/api/rates';
import { listWorkstations } from '@/lib/api/workstations';
import { getStrictSessionUser } from '@/lib/auth/session';
import { requireStrictUser } from '@/lib/auth/guards';
import { calculateBookingTotal } from '@/lib/pricing';
import { diffUtcNights, getUtcOffsetDateString } from '@/lib/format';
import { BOOKING_RULES } from '@/content/booking-rules';
import type { CreateReservationInput } from '@/lib/types';
import { CheckoutFormContainer } from '@/features/booking/checkout-summary';

const DEFAULT_MOVE_IN_OFFSET_DAYS = 90;
const DEFAULT_STAY_NIGHTS = BOOKING_RULES.minimumStayNights;

export const metadata: Metadata = {
  title: 'Checkout & Guest Details | NomadDesk',
  description: 'Complete your monthly furnished apartment reservation with workstation setup.',
  robots: { index: false, follow: false },
};

interface CheckoutPageProps {
  searchParams: Promise<{
    propertyId?: string;
    moveIn?: string;
    moveOut?: string;
    workstation?: string;
  }>;
}

export default async function BookingCheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;

  // Enforce authentication before checkout (Requirements §6 Flow 2 step 5)
  const currentUser = await getStrictSessionUser();
  if (!currentUser || !currentUser.isActive) {
    const query = new URLSearchParams();
    if (params.propertyId) query.set('propertyId', params.propertyId);
    if (params.moveIn) query.set('moveIn', params.moveIn);
    if (params.moveOut) query.set('moveOut', params.moveOut);
    if (params.workstation) query.set('workstation', params.workstation);
    const qs = query.toString();
    const callbackUrl = qs ? `/booking/checkout?${qs}` : '/booking/checkout';
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const parsedPropertyId = params.propertyId ? Number.parseInt(params.propertyId, 10) : NaN;
  if (!Number.isInteger(parsedPropertyId) || parsedPropertyId <= 0) {
    notFound();
  }

  const [property, rates, workstationData, callerHostProfile] = await Promise.all([
    getPropertyById(parsedPropertyId),
    getExchangeRates(),
    listWorkstations(),
    getHostByUserId(currentUser.id),
  ]);

  if (!property || property.status !== 'published') {
    notFound();
  }

  const host = await getHostProfile(property.hostId);
  if (host && host.status !== 'approved') {
    notFound();
  }

  const isOwnProperty = Boolean(callerHostProfile && callerHostProfile.id === property.hostId);

  const defaultMoveIn = getUtcOffsetDateString(DEFAULT_MOVE_IN_OFFSET_DAYS);
  const defaultMoveOut = getUtcOffsetDateString(DEFAULT_MOVE_IN_OFFSET_DAYS + DEFAULT_STAY_NIGHTS);
  const moveIn = params.moveIn || defaultMoveIn;
  const moveOut = params.moveOut || defaultMoveOut;

  const minStayNights = Math.max(property.minimumStayNights || DEFAULT_STAY_NIGHTS, DEFAULT_STAY_NIGHTS);
  const computedNights = diffUtcNights(moveIn, moveOut);
  const hasInvalidDateRange = computedNights < minStayNights;
  const displayNights = hasInvalidDateRange ? minStayNights : computedNights;

  // Resolve workstation price from DB (AC-CMS-2)
  const workstationType = params.workstation || 'comfort';
  const proPackage = workstationData.packages.find((pkg) => pkg.slug === 'pro-upgrade');
  const comfortPackage = workstationData.packages.find((pkg) => pkg.slug === 'comfort-base');
  const isProSelection = workstationType === 'pro' || workstationType === 'upgrade';
  const selectedPackage = isProSelection ? proPackage : comfortPackage;
  const workstationEURCents = selectedPackage ? selectedPackage.pricePerMonth : 0;
  const workstationLabel = selectedPackage
    ? workstationEURCents > 0
      ? `${selectedPackage.name} (+€${Math.round(workstationEURCents / 100)}/mo)`
      : `${selectedPackage.name} (Included)`
    : isProSelection
      ? 'Pro Upgrade'
      : 'Comfort Base (Included)';

  const pricing = calculateBookingTotal(
    property.pricePerMonth,
    displayNights,
    workstationEURCents,
    rates
  );

  async function createBookingAction(input: CreateReservationInput): Promise<{
    success: boolean;
    code?: string;
    error?: string;
    isCollision?: boolean;
  }> {
    'use server';

    try {
      const authUser = await requireStrictUser();
      const targetProperty = await getPropertyById(input.propertyId);
      if (!targetProperty || targetProperty.status !== 'published') {
        return {
          success: false,
          error: 'This apartment is no longer available for booking.',
        };
      }

      const targetHost = await getHostProfile(targetProperty.hostId);
      if (targetHost && targetHost.userId === authUser.id) {
        return {
          success: false,
          error: 'Hosts cannot book their own apartment.',
        };
      }

      // Recompute authoritative workstation fee from DB rather than trusting client cents
      const liveWorkstations = await listWorkstations();
      const requestedPkgSlug =
        input.workstationConfig?.packageId === 'pro' ||
        input.workstationConfig?.packageId === 'upgrade' ||
        input.workstationConfig?.packageId === 'pro-upgrade'
          ? 'pro-upgrade'
          : 'comfort-base';
      const livePkg = liveWorkstations.packages.find((pkg) => pkg.slug === requestedPkgSlug);
      const authoritativeWorkstationEUR = livePkg ? livePkg.pricePerMonth : 0;

      const reservation = await createReservation({
        ...input,
        userId: authUser.id,
        workstationMonthlyEUR: authoritativeWorkstationEUR,
        workstationConfig: {
          packageId: livePkg?.id ?? requestedPkgSlug,
          customMonthlyPriceEUR: authoritativeWorkstationEUR,
        },
      });

      return {
        success: true,
        code: reservation.code,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create reservation.';
      const isCollision =
        msg.toLowerCase().includes('booked') ||
        msg.toLowerCase().includes('blocked') ||
        msg.toLowerCase().includes('collision') ||
        msg.toLowerCase().includes('overlap') ||
        msg.toLowerCase().includes('unavailable');

      return {
        success: false,
        error: isCollision
          ? 'These dates were just booked. Please choose different dates.'
          : msg,
        isCollision,
      };
    }
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] pb-20">
      {/* Subheader bar */}
      <div className="bg-white border-b border-[var(--color-border-light)] py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[var(--color-text-on-light-muted)]">
          <Link
            href={`/l/apartments/${property.slug}`}
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-brand)] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Apartment Details</span>
          </Link>
          <div className="flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-[var(--color-success)]" />
            <span>Protected Payment Authorization</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mb-2">
            Complete your reservation request
          </h1>
          <p className="text-sm text-[var(--color-text-on-light-muted)]">
            Verify your guest details, payment method, and stay breakdown before submitting.
          </p>
        </div>

        {isOwnProperty && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] text-sm text-[var(--color-warning-text)]"
          >
            You are the host of this apartment. Hosts cannot book their own listings.{' '}
            <Link href="/host/listings" className="underline font-semibold">
              Manage your listings →
            </Link>
          </div>
        )}

        {hasInvalidDateRange && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-sm text-[var(--color-error-text)]"
          >
            Selected dates ({moveIn} to {moveOut}) must span at least {minStayNights} nights.{' '}
            <Link href={`/l/apartments/${property.slug}`} className="underline font-semibold">
              Choose different dates →
            </Link>
          </div>
        )}

        <Suspense
          fallback={
            <div className="p-12 text-center text-sm text-[var(--color-text-on-light-muted)]">
              Loading checkout...
            </div>
          }
        >
          <CheckoutFormContainer
            property={property}
            host={host}
            currentUser={{
              firstName: currentUser.firstName || '',
              lastName: currentUser.lastName || '',
              email: currentUser.email,
            }}
            moveIn={moveIn}
            moveOut={moveOut}
            nights={displayNights}
            workstationType={workstationType}
            workstationLabel={workstationLabel}
            workstationEURCents={workstationEURCents}
            pricing={pricing}
            disabledBooking={isOwnProperty || hasInvalidDateRange}
            createBookingAction={createBookingAction}
          />
        </Suspense>
      </main>
    </div>
  );
}
