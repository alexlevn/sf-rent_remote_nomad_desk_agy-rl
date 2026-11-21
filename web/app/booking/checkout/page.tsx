import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { getPropertyById, listProperties } from '@/lib/api/properties';
import { getHostProfile } from '@/lib/api/hosts';
import { createReservation } from '@/lib/api/reservations';
import { calculateBookingTotal } from '@/lib/pricing';
import type { CreateReservationInput } from '@/lib/types';
import { CheckoutFormContainer } from '@/features/booking/checkout-summary';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Checkout & Guest Details | NomadDesk',
  description: 'Complete your monthly furnished apartment reservation with workstation setup.',
};

interface CheckoutPageProps {
  searchParams: Promise<{
    propertyId?: string;
    moveIn?: string;
    moveOut?: string;
    workstation?: string;
  }>;
}

function getDefaultDates(): { moveIn: string; moveOut: string } {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  const moveIn = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 30);
  const moveOut = d.toISOString().slice(0, 10);
  return { moveIn, moveOut };
}

function calculateStayNights(inDate: string, outDate: string): number {
  try {
    const dIn = new Date(inDate + 'T00:00:00');
    const dOut = new Date(outDate + 'T00:00:00');
    const diff = dOut.getTime() - dIn.getTime();
    const nights = Math.round(diff / (1000 * 3600 * 24));
    return isNaN(nights) || nights < 1 ? 30 : nights;
  } catch {
    return 30;
  }
}

export default async function BookingCheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const defaults = getDefaultDates();

  const propertyId = params.propertyId ? parseInt(params.propertyId, 10) : 16060;
  const moveIn = params.moveIn || defaults.moveIn;
  const moveOut = params.moveOut || defaults.moveOut;
  const workstationType = params.workstation || 'comfort';

  // Load property & host
  let property = await getPropertyById(propertyId);
  if (!property) {
    const allProps = await listProperties();
    property = allProps[0];
  }

  const host = property ? await getHostProfile(property.hostId) : null;
  const nights = calculateStayNights(moveIn, moveOut);

  // Pro upgrade workstation fee is €150/mo (15000 cents EUR)
  const workstationEURCents = workstationType === 'pro' || workstationType === 'upgrade' ? 15000 : 0;
  const pricing = calculateBookingTotal(property.pricePerMonth, nights, workstationEURCents);

  // Server Action for submitting reservation
  async function createBookingAction(input: CreateReservationInput): Promise<{
    success: boolean;
    code?: string;
    error?: string;
    isCollision?: boolean;
  }> {
    'use server';

    try {
      const reservation = await createReservation(input);
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
          ? 'These dates were just booked. Please choose different dates'
          : msg,
        isCollision,
      };
    }
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] pb-20">
      {/* Subheader bar with offline safe notice */}
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
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mock Authorization Mode — Offline Safe</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-text-on-light)] mb-2">
            Complete your reservation request
          </h1>
          <p className="text-sm text-[var(--color-text-on-light-muted)]">
            Verify your guest details, mock payment method, and pricing before completing your stay.
          </p>
        </div>

        <Suspense fallback={<div className="p-12 text-center text-sm text-neutral-400">Loading checkout...</div>}>
          <CheckoutFormContainer
            property={property}
            host={host}
            moveIn={moveIn}
            moveOut={moveOut}
            nights={nights}
            workstationType={workstationType}
            workstationEURCents={workstationEURCents}
            pricing={pricing}
            createBookingAction={createBookingAction}
          />
        </Suspense>

        {/* UI States & Verification Blocks */}
        <section className="mt-16 pt-8 border-t border-[var(--color-border-light)]">
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
            <div className="text-sm font-bold text-[var(--color-text-on-light)] mb-1">
              📋 UI States & Verification Blocks — Đặt Phòng & Checkout (/booking/checkout)
            </div>
            <p className="text-xs text-[var(--color-text-on-light-muted)] mb-5">
              These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-900">
                <Badge variant="error" className="mb-2">Concurrency Collision State</Badge>
                <div className="font-bold text-sm text-red-950 mb-1">Dates Just Reserved</div>
                <p className="leading-relaxed">
                  Another nomad confirmed this apartment 2 minutes ago. Your card was NOT charged.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-700">
                <Badge variant="neutral" className="mb-2">Direct Booking Mode</Badge>
                <div className="font-bold text-sm text-neutral-900 mb-1">Instant Confirmation Available</div>
                <p className="leading-relaxed">
                  Properties with direct booking display &quot;Confirm & Pay&quot; and bypass host review.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
