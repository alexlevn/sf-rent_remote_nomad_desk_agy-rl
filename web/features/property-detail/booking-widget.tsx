'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { useCurrency } from '@/context/currency-context';
import { calculateBookingTotal } from '@/lib/pricing';
import { CalendarPicker } from './calendar-picker';
import type { BlockedDate, Property, Reservation } from '@/lib/types';

interface BookingWidgetProps {
  property: Property;
  blockedDates?: BlockedDate[];
  reservations?: Reservation[];
}

export function BookingWidget({
  property,
  blockedDates = [],
  reservations = [],
}: BookingWidgetProps) {
  const router = useRouter();
  const { formatPrice, rates } = useCurrency();
  const isSubmittingRef = useRef(false);

  // Default initial dates: 90 days out to 120 days out (30 nights)
  const defaultDates = useMemo(() => {
    const dIn = new Date();
    dIn.setDate(dIn.getDate() + 90);
    const dOut = new Date();
    dOut.setDate(dOut.getDate() + 120);
    return {
      moveIn: dIn.toISOString().slice(0, 10),
      moveOut: dOut.toISOString().slice(0, 10),
    };
  }, []);

  const [moveIn, setMoveIn] = useState<string>(defaultDates.moveIn);
  const [moveOut, setMoveOut] = useState<string>(defaultDates.moveOut);
  const [workstationSetup, setWorkstationSetup] = useState<'comfort' | 'pro'>('comfort');
  const [showCalendar, setShowCalendar] = useState(false);

  const minNights = property.minimumStayNights || 30;

  // Calculate nights
  const nights = useMemo(() => {
    if (!moveIn || !moveOut) return 0;
    const inDate = new Date(moveIn);
    const outDate = new Date(moveOut);
    const diffMs = outDate.getTime() - inDate.getTime();
    const n = Math.round(diffMs / (1000 * 3600 * 24));
    return n > 0 ? n : 0;
  }, [moveIn, moveOut]);

  // Check if dates conflict with blocked dates or active reservations
  const isConflict = useMemo(() => {
    if (!moveIn || !moveOut) return false;

    // Check blocked dates
    const hasBlocked = blockedDates.some(
      (b) => new Date(moveIn) < new Date(b.endDate) && new Date(moveOut) > new Date(b.startDate)
    );
    if (hasBlocked) return true;

    // Check active reservations
    const hasReservation = reservations.some(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        new Date(moveIn) < new Date(r.moveOutDate) &&
        new Date(moveOut) > new Date(r.moveInDate)
    );
    return hasReservation;
  }, [moveIn, moveOut, blockedDates, reservations]);

  const isInvalidNights = nights < minNights;
  const isDateUnavailable = isConflict || isInvalidNights;

  // Workstation add-on EUR cents
  const workstationEURCents = workstationSetup === 'pro' ? 15000 : 0;

  // Calculate pricing breakdown in real-time (AC-DETAIL-2)
  const pricing = useMemo(() => {
    try {
      const validNights = nights > 0 ? nights : minNights;
      return calculateBookingTotal(
        property.pricePerMonth,
        validNights,
        workstationEURCents,
        rates
      );
    } catch {
      return null;
    }
  }, [property.pricePerMonth, nights, workstationEURCents, rates, minNights]);

  const handleDateChange = (newIn: string, newOut: string) => {
    setMoveIn(newIn);
    setMoveOut(newOut);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDateUnavailable || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    const checkoutUrl = `/booking/checkout?propertyId=${property.id}&moveIn=${encodeURIComponent(
      moveIn
    )}&moveOut=${encodeURIComponent(moveOut)}&workstation=${workstationSetup}`;

    router.push(checkoutUrl);
  };

  // CTA button label per AC-DETAIL-5
  const ctaButtonLabel = property.isDirectBooking ? 'Book now' : 'Request to book';

  return (
    <div
      data-testid="booking-widget"
      className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-md sticky top-24"
    >
      {/* Price Header */}
      <div className="flex justify-between items-baseline mb-5 pb-4 border-b border-neutral-100">
        <div>
          <span className="font-bold text-2xl sm:text-3xl text-[var(--color-brand)]">
            {formatPrice(property.pricePerMonth)}
          </span>
          <span className="text-xs text-[var(--color-text-on-light-muted)]"> / month</span>
        </div>
        <span className="badge badge-neutral text-xs px-2.5 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-700">
          {minNights}-Night Min
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selector Row */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
            Check-in / Check-out
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="date"
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                data-testid="move-in-input"
              />
            </div>
            <div>
              <input
                type="date"
                value={moveOut}
                onChange={(e) => setMoveOut(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                data-testid="move-out-input"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[11px] text-[var(--color-text-on-light-muted)]">
              {nights > 0 ? `${nights} nights selected` : 'Please select dates'}
            </span>
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className="text-[11px] text-[var(--color-brand)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CalendarIcon className="w-3 h-3" />
              <span>{showCalendar ? 'Hide calendar' : 'Show calendar'}</span>
            </button>
          </div>
        </div>

        {/* Embedded Interactive Calendar Picker (AC-DETAIL-6) */}
        {showCalendar && (
          <div className="mt-2">
            <CalendarPicker
              moveIn={moveIn}
              moveOut={moveOut}
              onChange={handleDateChange}
              blockedDates={blockedDates}
              reservations={reservations}
              minimumStayNights={minNights}
            />
          </div>
        )}

        {/* Validation Warning Alert */}
        {isConflict && (
          <div
            data-testid="date-conflict-alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <strong>Dates Already Booked</strong>
              <p className="mt-0.5 text-[11px]">
                This residence is unavailable for the selected range. Please pick alternative dates.
              </p>
            </div>
          </div>
        )}

        {nights > 0 && nights < minNights && !isConflict && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Minimum Stay Required</strong>
              <p className="mt-0.5 text-[11px]">
                NomadDesk requires at least {minNights} nights for all reservations.
              </p>
            </div>
          </div>
        )}

        {/* Workstation Setup Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
            Workstation Setup
          </label>
          <select
            value={workstationSetup}
            onChange={(e) => setWorkstationSetup(e.target.value as 'comfort' | 'pro')}
            className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
            data-testid="workstation-select"
          >
            <option value="comfort">Comfort Base (Included - $0)</option>
            <option value="pro">Pro Upgrade (+€150/mo: Herman Miller + 4K Ultrawide)</option>
          </select>
        </div>

        {/* Real-time Price Breakdown Calculation (AC-DETAIL-2) */}
        {pricing && (
          <div
            data-testid="price-breakdown"
            className="border-t border-b border-[var(--color-border-light)] py-3 my-3 space-y-2 text-xs"
          >
            <div className="flex justify-between text-[var(--color-text-on-light)]">
              <span>Monthly Rent ({nights} nights)</span>
              <span>{formatPrice(pricing.rentAmountUSD, { showCents: true })}</span>
            </div>
            <div className="flex justify-between text-[var(--color-text-on-light)]">
              <span>Workstation Setup</span>
              <span className={workstationSetup === 'pro' ? 'text-[var(--color-brand)] font-medium' : ''}>
                {pricing.workstationFeeUSD > 0
                  ? formatPrice(pricing.workstationFeeUSD, { showCents: true })
                  : '$0.00'}
              </span>
            </div>
            <div className="flex justify-between text-[var(--color-text-on-light-muted)]">
              <span>Platform Service Fee (10%)</span>
              <span className="font-medium text-emerald-600">Included</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[var(--color-text-on-light)] pt-2 border-t border-neutral-100">
              <span>Total Due</span>
              <span
                data-testid="total-due-price"
                className="text-[var(--color-brand)] text-base font-extrabold"
              >
                {formatPrice(pricing.totalAmountUSD, { showCents: true })}
              </span>
            </div>
          </div>
        )}

        {/* CTA Button (AC-DETAIL-3, AC-DETAIL-5) */}
        <button
          type="submit"
          disabled={isDateUnavailable}
          data-testid="booking-cta-btn"
          className="w-full py-3.5 px-6 rounded-full font-bold text-sm text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm active:translate-y-px cursor-pointer"
        >
          {ctaButtonLabel} →
        </button>

        {/* Subtext info */}
        <p className="text-[11px] text-[var(--color-text-on-light-muted)] text-center leading-normal">
          {property.isDirectBooking
            ? 'Instant confirmation. Your card is authorized now and charged when the stay is confirmed.'
            : "You won't be charged until the host accepts your request within 48 hours."}
        </p>
      </form>
    </div>
  );
}
