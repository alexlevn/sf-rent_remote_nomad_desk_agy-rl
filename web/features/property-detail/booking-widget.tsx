'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { useCurrency } from '@/context/currency-context';
import { calculateBookingTotal } from '@/lib/pricing';
import { BOOKING_RULES } from '@/content/booking-rules';
import { diffUtcNights } from '@/lib/format';
import { CalendarPicker } from './calendar-picker';
import type { BlockedDate, Property, Reservation } from '@/lib/types';

const PRO_UPGRADE_MONTHLY_EUR_CENTS = 15000;

interface BookingWidgetProps {
  property: Property;
  blockedDates?: BlockedDate[];
  reservations?: Reservation[];
  proUpgradePriceEUR?: number;
  defaultMoveIn: string;
  defaultMoveOut: string;
  initialWorkstation?: 'comfort' | 'pro';
}

export function BookingWidget({
  property,
  blockedDates = [],
  reservations = [],
  proUpgradePriceEUR,
  defaultMoveIn,
  defaultMoveOut,
  initialWorkstation = 'comfort',
}: BookingWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { formatPrice, rates } = useCurrency();
  const isSubmittingRef = useRef(false);

  const [moveIn, setMoveIn] = useState<string>(defaultMoveIn);
  const [moveOut, setMoveOut] = useState<string>(defaultMoveOut);
  const [workstationSetup, setWorkstationSetup] = useState<'comfort' | 'pro'>(initialWorkstation);
  const [showCalendar, setShowCalendar] = useState(false);

  // Reset navigation lock when returning to this page via Back/BFCache
  useEffect(() => {
    isSubmittingRef.current = false;
    const handlePageShow = () => {
      isSubmittingRef.current = false;
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [pathname]);

  const minNights = Math.max(
    property.minimumStayNights || BOOKING_RULES.minimumStayNights,
    BOOKING_RULES.minimumStayNights
  );

  const nights = useMemo(() => {
    if (!moveIn || !moveOut) return 0;
    const diff = diffUtcNights(moveIn, moveOut);
    return diff > 0 ? diff : 0;
  }, [moveIn, moveOut]);

  // Lexicographical YYYY-MM-DD comparison avoids local timezone off-by-one bugs
  const isConflict = useMemo(() => {
    if (!moveIn || !moveOut || moveOut <= moveIn) return false;

    const hasBlocked = blockedDates.some((b) => moveIn < b.endDate && moveOut > b.startDate);
    if (hasBlocked) return true;

    return reservations.some(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        moveIn < r.moveOutDate &&
        moveOut > r.moveInDate
    );
  }, [moveIn, moveOut, blockedDates, reservations]);

  const isInvalidNights = nights < minNights;
  const isDateUnavailable = isConflict || isInvalidNights;

  const proMonthlyCents = proUpgradePriceEUR ?? PRO_UPGRADE_MONTHLY_EUR_CENTS;
  const workstationEURCents = workstationSetup === 'pro' ? proMonthlyCents : 0;

  const pricing = useMemo(() => {
    if (nights < minNights) return null;
    try {
      return calculateBookingTotal(property.pricePerMonth, nights, workstationEURCents, rates);
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
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-700">
          {minNights}-Night Min
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selector Row */}
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="booking-move-in"
                className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
              >
                Check-in
              </label>
              <input
                id="booking-move-in"
                type="date"
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                data-testid="move-in-input"
              />
            </div>
            <div>
              <label
                htmlFor="booking-move-out"
                className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
              >
                Check-out
              </label>
              <input
                id="booking-move-out"
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
              {nights > 0 ? `${nights} nights selected` : 'Select valid check-in & check-out dates'}
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

        {/* Validation Warning Alerts */}
        {isConflict && (
          <div
            data-testid="date-conflict-alert"
            role="alert"
            className="p-3 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-lg text-xs text-[var(--color-error-text)] flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--color-error)] mt-0.5" />
            <div>
              <strong>Dates Already Booked</strong>
              <p className="mt-0.5 text-[11px]">
                This residence is unavailable for the selected range. Please pick alternative dates.
              </p>
            </div>
          </div>
        )}

        {isInvalidNights && !isConflict && (
          <div
            role="alert"
            className="p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg text-xs text-[var(--color-warning-text)] flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--color-warning)] mt-0.5" />
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
          <label
            htmlFor="booking-workstation-select"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Workstation Setup
          </label>
          <select
            id="booking-workstation-select"
            value={workstationSetup}
            onChange={(e) => setWorkstationSetup(e.target.value as 'comfort' | 'pro')}
            className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
            data-testid="workstation-select"
          >
            <option value="comfort">Comfort Base (Included - {formatPrice(0)})</option>
            <option value="pro">
              Pro Upgrade (+€{Math.round(proMonthlyCents / 100)}/mo: Herman Miller + 4K Ultrawide)
            </option>
          </select>
        </div>

        {/* Real-time Price Breakdown Calculation (AC-DETAIL-2) */}
        {pricing ? (
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
              <span
                className={
                  workstationSetup === 'pro' ? 'text-[var(--color-brand)] font-medium' : ''
                }
              >
                {pricing.workstationFeeUSD > 0
                  ? formatPrice(pricing.workstationFeeUSD, { showCents: true })
                  : formatPrice(0, { showCents: true })}
              </span>
            </div>
            <div className="flex justify-between text-[var(--color-text-on-light-muted)]">
              <span>Platform Service Fee ({BOOKING_RULES.commissionPercent}%)</span>
              <span className="font-medium text-[var(--color-success)]">Included</span>
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
        ) : (
          <div className="border-t border-b border-[var(--color-border-light)] py-3 my-3 text-xs text-[var(--color-text-on-light-muted)] text-center">
            Select at least {minNights} consecutive nights to see total due.
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

        <p className="text-[11px] text-[var(--color-text-on-light-muted)] text-center leading-normal">
          {property.isDirectBooking
            ? 'Instant confirmation. Your card is authorized now and charged when the stay is confirmed.'
            : `You won't be charged until the host accepts your request within ${BOOKING_RULES.respondHours} hours.`}
        </p>
      </form>
    </div>
  );
}
