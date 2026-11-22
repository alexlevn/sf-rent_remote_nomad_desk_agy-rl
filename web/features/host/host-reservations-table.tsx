'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import type { Reservation, Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { BOOKING_RULES } from '@/content/booking-rules';
import { MS_PER_HOUR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ReservationCards, ReservationTable } from '@/features/host/reservations/reservation-list-views';
import { ReservationDetailDrawer } from '@/features/host/reservations/reservation-detail-drawer';
import { RejectReservationModal } from '@/features/host/reservations/reject-reservation-modal';

type ActionResult = { success: boolean; error?: string; reservation?: Reservation };

export interface HostReservationsTableProps {
  initialReservations: Reservation[];
  properties: Property[];
  todayIso: string;
  isReadOnly?: boolean;
  onAcceptAction: (reservationId: number) => Promise<ActionResult>;
  onRejectAction: (reservationId: number, reason?: string) => Promise<ActionResult>;
}

type TabKey = 'requests' | 'upcoming' | 'current' | 'past' | 'cancelled';

const CLOCK_TICK_MS = 60_000;

export const HostReservationsTable: React.FC<HostReservationsTableProps> = ({
  initialReservations,
  properties,
  todayIso,
  isReadOnly = false,
  onAcceptAction,
  onRejectAction,
}) => {
  const { formatPrice } = useCurrency();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<TabKey>('requests');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Detail Drawer & Reject Modal (mutually exclusive — never stacked)
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
  const [rejectingReservation, setRejectingReservation] = useState<Reservation | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const isProcessingRef = useRef(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!detailReservation && !rejectingReservation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessingRef.current) {
        if (rejectingReservation) setRejectingReservation(null);
        else if (detailReservation) setDetailReservation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailReservation, rejectingReservation]);

  const propertyMap = new Map<number, Property>(properties.map((p) => [p.id, p]));

  const getHoursLeft = (res: Reservation): number => {
    if (!res.respondBy) return 0;
    const diffMs = new Date(res.respondBy).getTime() - nowMs;
    return Math.max(0, Math.ceil(diffMs / MS_PER_HOUR));
  };

  // Filter reservations dynamically against server UTC todayIso
  const lists: Record<TabKey, Reservation[]> = {
    requests: reservations.filter((r) => r.status === 'pending'),
    upcoming: reservations.filter((r) => r.status === 'confirmed' && r.moveInDate >= todayIso),
    current: reservations.filter(
      (r) => r.status === 'confirmed' && r.moveInDate < todayIso && r.moveOutDate >= todayIso
    ),
    past: reservations.filter(
      (r) => r.status === 'completed' || (r.status === 'confirmed' && r.moveOutDate < todayIso)
    ),
    cancelled: reservations.filter(
      (r) => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired'
    ),
  };
  const filteredReservations = lists[activeTab] ?? reservations;

  const replaceReservation = (updated: Reservation) =>
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

  // Accept Action (AC-HOST-4)
  const handleAccept = async (res: Reservation) => {
    if (isReadOnly || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setActionLoadingId(res.id);
    setFeedback(null);

    try {
      const response = await onAcceptAction(res.id);
      if (response.success) {
        const updatedRecord: Reservation = response.reservation ?? {
          ...res,
          status: 'confirmed',
          paymentStatus: 'captured',
        };
        replaceReservation(updatedRecord);
        if (detailReservation?.id === res.id) setDetailReservation(updatedRecord);
        setFeedback({
          type: 'success',
          message: `Booking accepted for ${res.guestName}! Reservation code: ${res.code}. Confirmation email has been sent to the guest.`,
        });
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to accept booking request.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'A network error occurred while accepting the booking request.' });
    } finally {
      isProcessingRef.current = false;
      setActionLoadingId(null);
    }
  };

  // Reject Action (AC-HOST-5) — always close detail drawer first (one dialog at a time)
  const handleOpenRejectModal = (res: Reservation) => {
    if (isReadOnly) return;
    setDetailReservation(null);
    setRejectingReservation(res);
  };

  const handleConfirmReject = async (finalReason: string): Promise<string | null> => {
    const target = rejectingReservation;
    if (isReadOnly || !target || isProcessingRef.current) return null;

    isProcessingRef.current = true;
    setActionLoadingId(target.id);

    try {
      const response = await onRejectAction(target.id, finalReason);
      if (!response.success) return response.error || 'Failed to reject booking request.';

      replaceReservation(
        response.reservation ?? { ...target, status: 'rejected', rejectionReason: finalReason, paymentStatus: 'voided' }
      );
      setFeedback({
        type: 'success',
        message: `Booking request ${target.code} was rejected. Card authorization voided.`,
      });
      setRejectingReservation(null);
      return null;
    } catch {
      return 'A network error occurred while rejecting the booking request.';
    } finally {
      isProcessingRef.current = false;
      setActionLoadingId(null);
    }
  };

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'requests', label: 'Requests', count: lists.requests.length },
    { key: 'upcoming', label: 'Upcoming', count: lists.upcoming.length },
    { key: 'current', label: 'Current', count: lists.current.length },
    { key: 'past', label: 'Past', count: lists.past.length },
    { key: 'cancelled', label: 'Cancelled / Rejected', count: lists.cancelled.length },
  ];

  const listProps = {
    reservations: filteredReservations,
    propertyMap,
    netPercent: 100 - BOOKING_RULES.commissionPercent,
    isReadOnly,
    actionLoadingId,
    formatPrice,
    getHoursLeft,
    onAccept: handleAccept,
    onReject: handleOpenRejectModal,
    onDetails: setDetailReservation,
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={cn(
            'p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs',
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800',
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss notification"
            className="text-neutral-400 hover:text-neutral-700 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div
        role="tablist"
        aria-label="Reservation status filter"
        className="flex overflow-x-auto gap-2 pb-1 border-b border-[var(--color-border-light)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer',
              activeTab === tab.key
                ? 'bg-[var(--color-brand)] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 text-[10px] rounded-full font-bold',
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-200 text-neutral-700',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>


      {filteredReservations.length === 0 ? (
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-12 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900 mb-1">No reservations found</h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
            {activeTab === 'requests'
              ? 'You have answered all pending booking requests. Great job!'
              : `There are currently no reservations in the ${activeTab} category.`}
          </p>
        </div>
      ) : (
        <>
          <ReservationTable {...listProps} />
          <ReservationCards {...listProps} />
        </>
      )}

      {detailReservation && (
        <ReservationDetailDrawer
          reservation={detailReservation}
          property={propertyMap.get(detailReservation.propertyId)}
          hoursLeft={getHoursLeft(detailReservation)}
          isReadOnly={isReadOnly}
          isActionLoading={actionLoadingId === detailReservation.id}
          formatPrice={formatPrice}
          onClose={() => setDetailReservation(null)}
          onAccept={handleAccept}
          onReject={handleOpenRejectModal}
        />
      )}

      {/* Reject Modal Dialog (AC-HOST-5) */}
      {rejectingReservation && (
        <RejectReservationModal
          reservation={rejectingReservation}
          isLoading={actionLoadingId === rejectingReservation.id}
          onCancel={() => setRejectingReservation(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
};
