'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseUtcDate, toUtcDateString } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BlockedDate, Reservation } from '@/lib/types';

interface CalendarPickerProps {
  moveIn: string;
  moveOut: string;
  onChange: (moveIn: string, moveOut: string) => void;
  blockedDates?: BlockedDate[];
  reservations?: Reservation[];
  minimumStayNights?: number;
}

function addDaysUtc(dateStr: string, days: number): string {
  const parsed = parseUtcDate(dateStr);
  if (!parsed) return dateStr;
  const next = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate() + days)
  );
  return toUtcDateString(next);
}

function getLocalTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarPicker({
  moveIn,
  moveOut,
  onChange,
  blockedDates = [],
  reservations = [],
  minimumStayNights = 30,
}: CalendarPickerProps) {
  const initialUtcDate = useMemo(() => {
    const parsed = moveIn ? parseUtcDate(moveIn) : null;
    if (parsed) return parsed;
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  }, [moveIn]);

  const [currentYear, setCurrentYear] = useState(initialUtcDate.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialUtcDate.getUTCMonth()); // 0-indexed
  const [selectionStep, setSelectionStep] = useState<'in' | 'out'>('in');

  // Sync displayed calendar month when moveIn input changes externally
  useEffect(() => {
    const parsed = moveIn ? parseUtcDate(moveIn) : null;
    if (!parsed) return;
    setCurrentYear(parsed.getUTCFullYear());
    setCurrentMonth(parsed.getUTCMonth());
  }, [moveIn]);

  const todayStr = getLocalTodayString();

  const isDateDisabled = (dateStr: string): boolean => {
    if (dateStr < todayStr) return true;

    const isBlocked = blockedDates.some((b) => dateStr >= b.startDate && dateStr < b.endDate);
    if (isBlocked) return true;

    const isReserved = reservations.some(
      (r) =>
        (r.status === 'confirmed' || r.status === 'pending') &&
        dateStr >= r.moveInDate &&
        dateStr < r.moveOutDate
    );
    return isReserved;
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
      if (moveOut && dateStr >= moveOut) {
        onChange(dateStr, addDaysUtc(dateStr, minimumStayNights));
      } else {
        onChange(dateStr, moveOut);
      }
    } else {
      if (dateStr <= moveIn) {
        setSelectionStep('out');
        onChange(dateStr, addDaysUtc(dateStr, minimumStayNights));
      } else {
        onChange(moveIn, dateStr);
        setSelectionStep('in');
      }
    }
  };

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(currentYear, currentMonth, 1)));

  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(currentYear, currentMonth, 1)).getUTCDay();

  const days: (string | null)[] = [];
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
      <div className="flex justify-between items-center mb-3 px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-md hover:bg-neutral-100 transition-colors text-neutral-600 cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-sm text-[var(--color-text-on-light)]">{monthName}</span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-md hover:bg-neutral-100 transition-colors text-neutral-600 cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-neutral-400 mb-1 text-[11px]">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="h-9 sm:h-8 w-full" />;
          }

          const dayNum = Number.parseInt(dateStr.slice(8), 10);
          const disabled = isDateDisabled(dateStr);
          const isMoveIn = dateStr === moveIn;
          const isMoveOut = dateStr === moveOut;
          const isInRange = Boolean(moveIn && moveOut && dateStr > moveIn && dateStr < moveOut);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              aria-disabled={disabled}
              data-date={dateStr}
              data-disabled={disabled ? 'true' : undefined}
              onClick={() => handleDateClick(dateStr)}
              className={cn(
                'h-9 w-9 sm:h-8 sm:w-8 mx-auto rounded-full flex items-center justify-center font-medium transition-all text-xs',
                disabled
                  ? 'text-neutral-300 line-through bg-neutral-50 cursor-not-allowed opacity-50'
                  : isMoveIn || isMoveOut
                    ? 'bg-[var(--color-brand)] text-white font-bold shadow-xs cursor-pointer'
                    : isInRange
                      ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-semibold cursor-pointer'
                      : 'hover:bg-neutral-100 text-[var(--color-text-on-light)] cursor-pointer'
              )}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand)] inline-block" />
          <span>Selected</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-200 inline-block" />
          <span>Unavailable</span>
        </span>
        <span className="text-[var(--color-brand)] font-semibold">
          Min {minimumStayNights} nights
        </span>
      </div>
    </div>
  );
}
