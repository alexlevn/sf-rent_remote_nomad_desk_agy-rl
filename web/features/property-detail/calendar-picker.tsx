'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BlockedDate, Reservation } from '@/lib/types';

interface CalendarPickerProps {
  moveIn: string;
  moveOut: string;
  onChange: (moveIn: string, moveOut: string) => void;
  blockedDates?: BlockedDate[];
  reservations?: Reservation[];
  minimumStayNights?: number;
}

export function CalendarPicker({
  moveIn,
  moveOut,
  onChange,
  blockedDates = [],
  reservations = [],
  minimumStayNights = 30,
}: CalendarPickerProps) {
  // Use moveIn month as initial viewing month, or current month
  const initialDate = useMemo(() => {
    if (moveIn) {
      const d = new Date(moveIn);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [moveIn]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed
  const [selectionStep, setSelectionStep] = useState<'in' | 'out'>('in');

  // Check if a date string YYYY-MM-DD is disabled (AC-DETAIL-6)
  const isDateDisabled = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(dateStr);
    dateObj.setHours(0, 0, 0, 0);

    // Past dates are disabled
    if (dateObj < today) {
      return true;
    }

    // Blocked dates from host
    const isBlocked = blockedDates.some(
      (b) => dateStr >= b.startDate && dateStr < b.endDate
    );
    if (isBlocked) {
      return true;
    }

    // Active reservations (confirmed or pending)
    const isReserved = reservations.some(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        dateStr >= r.moveInDate &&
        dateStr < r.moveOutDate
    );
    if (isReserved) {
      return true;
    }

    return false;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDateClick = (dateStr: string) => {
    if (isDateDisabled(dateStr)) return;

    if (selectionStep === 'in') {
      setSelectionStep('out');
      // If previous moveOut is invalid relative to new moveIn, reset moveOut
      if (moveOut && new Date(dateStr) >= new Date(moveOut)) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + minimumStayNights);
        const autoOut = d.toISOString().slice(0, 10);
        onChange(dateStr, autoOut);
      } else {
        onChange(dateStr, moveOut);
      }
    } else {
      // Step 'out'
      if (new Date(dateStr) <= new Date(moveIn)) {
        // If user clicked before or on moveIn, switch moveIn to this date
        setSelectionStep('out');
        const d = new Date(dateStr);
        d.setDate(d.getDate() + minimumStayNights);
        onChange(dateStr, d.toISOString().slice(0, 10));
      } else {
        onChange(moveIn, dateStr);
        setSelectionStep('in');
      }
    }
  };

  // Month metadata
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const days = [];
  // Empty slots before 1st day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    days.push(`${currentYear}-${mm}-${dd}`);
  }

  return (
    <div
      data-testid="calendar-picker"
      className="p-3 bg-white border border-[var(--color-border-light)] rounded-xl text-xs select-none shadow-xs"
    >
      {/* Calendar Header with Navigation */}
      <div className="flex justify-between items-center mb-3 px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 rounded-md hover:bg-neutral-100 transition-colors text-neutral-600"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-sm text-[var(--color-text-on-light)]">
          {monthName}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 rounded-md hover:bg-neutral-100 transition-colors text-neutral-600"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-neutral-400 mb-1 text-[11px]">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="h-7 w-7" />;
          }

          const dayNum = parseInt(dateStr.slice(8), 10);
          const disabled = isDateDisabled(dateStr);
          const isMoveIn = dateStr === moveIn;
          const isMoveOut = dateStr === moveOut;
          const isInRange =
            moveIn &&
            moveOut &&
            dateStr > moveIn &&
            dateStr < moveOut;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              aria-disabled={disabled}
              data-date={dateStr}
              data-disabled={disabled ? 'true' : undefined}
              onClick={() => handleDateClick(dateStr)}
              className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center font-medium transition-all text-xs ${
                disabled
                  ? 'text-neutral-300 line-through bg-neutral-50 cursor-not-allowed opacity-50'
                  : isMoveIn || isMoveOut
                    ? 'bg-[var(--color-brand)] text-white font-bold shadow-xs'
                    : isInRange
                      ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-semibold'
                      : 'hover:bg-neutral-100 text-[var(--color-text-on-light)]'
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend / Status */}
      <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand)] inline-block" />
          <span>Selected</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-200 inline-block line-through text-[8px] text-center" />
          <span>Unavailable (AC-DETAIL-6)</span>
        </span>
        <span className="text-[var(--color-brand)] font-semibold">
          Min {minimumStayNights} nights
        </span>
      </div>
    </div>
  );
}
