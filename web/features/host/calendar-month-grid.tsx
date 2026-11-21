'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  Ban,
  Building,
} from 'lucide-react';
import type { Property, Reservation, BlockedDate } from '@/lib/types';
import { BlockDatesModal } from './block-dates-modal';

export interface CalendarMonthGridProps {
  properties: Property[];
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  initialPropertyId?: number;
  onBlockAction: (data: {
    propertyId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => Promise<{ success: boolean; data?: BlockedDate; error?: string }>;
  onUnblockAction: (blockedDateId: number) => Promise<{ success: boolean; error?: string }>;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  properties,
  reservations: initialReservations,
  blockedDates: initialBlockedDates,
  initialPropertyId,
  onBlockAction,
  onUnblockAction,
}) => {
  // Current selected property
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>(() => {
    if (initialPropertyId && properties.some((p) => p.id === initialPropertyId)) {
      return initialPropertyId;
    }
    return properties[0]?.id || 16060;
  });

  // Calendar Month Navigation
  // Seed bookings like ND-SEED1/ND-SEED2 are in late 2026 or relative dates
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Default to Dec 2026 or current date
    const d = new Date();
    // If current year is before 2026, set to Dec 2026 to match design and seed
    if (d.getFullYear() < 2026) {
      return new Date(2026, 11, 1);
    }
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(initialBlockedDates);
  const reservations = initialReservations;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unblockTarget, setUnblockTarget] = useState<BlockedDate | null>(null);
  const [modalInitialStart, setModalInitialStart] = useState<string>('');
  const [modalInitialEnd, setModalInitialEnd] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || properties[0],
    [properties, selectedPropertyId]
  );

  // Month information
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Compute days in month and padding
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNum: number;
      dateStr: string; // YYYY-MM-DD
      isCurrentMonth: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      days.push({
        dayNum,
        dateStr: `${prevDate.getFullYear()}-${mStr}-${dStr}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dayNum: d,
        dateStr: `${year}-${mStr}-${dStr}`,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill grid (total multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let n = 1; n <= remaining; n++) {
        const nextDate = new Date(year, month + 1, n);
        const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
        const dStr = String(n).padStart(2, '0');
        days.push({
          dayNum: n,
          dateStr: `${nextDate.getFullYear()}-${mStr}-${dStr}`,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [year, month]);

  // Fast lookups for property's reservations and blocks
  const propertyReservations = useMemo(
    () => reservations.filter((r) => r.propertyId === selectedPropertyId),
    [reservations, selectedPropertyId]
  );

  const propertyBlockedDates = useMemo(
    () => blockedDates.filter((b) => b.propertyId === selectedPropertyId),
    [blockedDates, selectedPropertyId]
  );

  // Helper: find reservation for date string (YYYY-MM-DD)
  const getReservationForDate = (dateStr: string) => {
    return propertyReservations.find((r) => {
      if (r.status !== 'confirmed' && r.status !== 'pending') return false;
      return dateStr >= r.moveInDate && dateStr < r.moveOutDate;
    });
  };

  // Helper: find block for date string (YYYY-MM-DD)
  const getBlockForDate = (dateStr: string) => {
    return propertyBlockedDates.find((b) => dateStr >= b.startDate && dateStr < b.endDate);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleOpenBlockModal = (defaultStart?: string, defaultEnd?: string) => {
    setUnblockTarget(null);
    setModalInitialStart(defaultStart || '');
    setModalInitialEnd(defaultEnd || '');
    setIsModalOpen(true);
  };

  const handleDayClick = (dateStr: string) => {
    const existingBlock = getBlockForDate(dateStr);
    if (existingBlock) {
      // Prompt unblock
      setUnblockTarget(existingBlock);
      setIsModalOpen(true);
      return;
    }

    const existingRes = getReservationForDate(dateStr);
    if (existingRes) {
      // Booking already exists
      return;
    }

    // Open block modal pre-filled with this day
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const mStr = String(nextDay.getMonth() + 1).padStart(2, '0');
    const dStr = String(nextDay.getDate()).padStart(2, '0');
    const nextDayStr = `${nextDay.getFullYear()}-${mStr}-${dStr}`;

    handleOpenBlockModal(dateStr, nextDayStr);
  };

  const handleBlockSuccess = async (data: {
    propertyId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => {
    const res = await onBlockAction(data);
    if (res.success && res.data) {
      setBlockedDates((prev) => [...prev, res.data!]);
      setFeedback({
        type: 'success',
        message: `Dates successfully blocked from ${data.startDate} to ${data.endDate}.`,
      });
    }
    return res;
  };

  const handleUnblockSuccess = async (blockedDateId: number) => {
    const res = await onUnblockAction(blockedDateId);
    if (res.success) {
      setBlockedDates((prev) => prev.filter((b) => b.id !== blockedDateId));
      setFeedback({
        type: 'success',
        message: 'Dates successfully unblocked and open for booking.',
      });
    }
    return res;
  };

  if (!selectedProperty) {
    return (
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center">
        <Building className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-neutral-900">No Listings Found</h3>
        <p className="text-sm text-neutral-500">Add a listing to manage its availability calendar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-[var(--color-border-light)] shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label htmlFor="calendar-property-select" className="text-xs font-bold text-neutral-700 whitespace-nowrap">
            Listing:
          </label>
          <select
            id="calendar-property-select"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
            className="flex-1 sm:w-80 px-3.5 py-2 text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all font-medium text-neutral-900"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => handleOpenBlockModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Block Custom Dates</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Ban className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Calendar Card */}
      <div className="card bg-white border border-[var(--color-border-light)] rounded-2xl p-4 sm:p-6 shadow-sm">
        {/* Month Header and Legend */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-[var(--color-border-light)]">
          <div className="flex items-center gap-3">
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{monthName}</h3>
            <div className="flex items-center gap-1 border border-[var(--color-border-light)] rounded-lg p-0.5 bg-neutral-50">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-white rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Confirmed Booking</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending Request</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-neutral-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              <span>Host Blocked</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-white border border-neutral-400" />
              <span>Available</span>
            </div>
          </div>
        </div>

        {/* 7-Day Column Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-neutral-500 mb-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {calendarDays.map((item) => {
            const reservation = getReservationForDate(item.dateStr);
            const blocked = getBlockForDate(item.dateStr);

            let dayStyle = 'bg-white border-neutral-200 text-neutral-900 hover:border-[var(--color-brand)]';
            let badgeContent: React.ReactNode = null;

            if (reservation) {
              if (reservation.status === 'confirmed') {
                dayStyle =
                  'bg-blue-50 border-blue-200 text-blue-950 hover:bg-blue-100 cursor-pointer';
                badgeContent = (
                  <div
                    className="text-[10px] font-bold text-blue-700 mt-1 truncate px-1 rounded bg-blue-100/80"
                    title={`Booking ${reservation.code}: ${reservation.guestName}`}
                  >
                    {reservation.code}
                  </div>
                );
              } else if (reservation.status === 'pending') {
                dayStyle =
                  'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100 cursor-pointer';
                badgeContent = (
                  <div
                    className="text-[10px] font-bold text-amber-700 mt-1 truncate px-1 rounded bg-amber-100/80"
                    title={`Pending Request: ${reservation.guestName}`}
                  >
                    {reservation.code}
                  </div>
                );
              }
            } else if (blocked) {
              dayStyle =
                'bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200 cursor-pointer relative overflow-hidden';
              badgeContent = (
                <div
                  className="text-[9px] font-semibold text-neutral-600 mt-1 truncate px-1"
                  title={`Host Blocked: ${blocked.reason || 'Owner Block'}. Click to unblock.`}
                >
                  {blocked.reason || 'Blocked'}
                </div>
              );
            }

            return (
              <div
                key={item.dateStr}
                onClick={() => handleDayClick(item.dateStr)}
                className={`min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2 border rounded-xl flex flex-col justify-between transition-all ${dayStyle} ${
                  !item.isCurrentMonth ? 'opacity-35' : ''
                }`}
                title={
                  blocked
                    ? `Blocked: ${blocked.reason || 'Owner Block'} (Click to unblock)`
                    : reservation
                    ? `${reservation.status.toUpperCase()}: ${reservation.code} (${reservation.guestName})`
                    : `Available - Click to block`
                }
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{item.dayNum}</span>
                  {blocked && <Ban className="w-3 h-3 text-neutral-400 shrink-0" />}
                  {reservation?.status === 'confirmed' && (
                    <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
                  )}
                  {reservation?.status === 'pending' && (
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </div>

                {badgeContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Block Dates & Unblock Modal */}
      {isModalOpen && (
        <BlockDatesModal
          key={`${selectedProperty.id}-${modalInitialStart}-${modalInitialEnd}-${unblockTarget?.id || 'new'}`}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={selectedProperty.id}
          propertyTitle={selectedProperty.title}
          initialStartDate={modalInitialStart}
          initialEndDate={modalInitialEnd}
          unblockTarget={unblockTarget}
          onBlock={handleBlockSuccess}
          onUnblock={handleUnblockSuccess}
        />
      )}
    </div>
  );
};
