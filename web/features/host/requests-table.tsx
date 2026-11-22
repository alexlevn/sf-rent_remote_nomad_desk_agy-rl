'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Reservation, Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { BOOKING_RULES } from '@/content/booking-rules';
import { formatUtcDateRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { UpcomingCheckIns, type UpcomingCheckInItem } from '@/features/host/dashboard/upcoming-check-ins';
import { DeclineRequestModal } from '@/features/host/dashboard/decline-request-modal';

export type { UpcomingCheckInItem };

export interface PendingRequestItem {
  reservation: Reservation;
  property: Property | null;
  hoursRemaining: number;
}


export interface RequestsTableProps {
  initialRequests: PendingRequestItem[];
  upcomingCheckIns: UpcomingCheckInItem[];
  isReadOnly?: boolean;
  onAcceptAction: (reservationId: number) => Promise<{ success: boolean; error?: string }>;
  onRejectAction: (
    reservationId: number,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({
  initialRequests,
  upcomingCheckIns: initialUpcoming,
  isReadOnly = false,
  onAcceptAction,
  onRejectAction,
}) => {
  const { formatPrice } = useCurrency();
  const [requests, setRequests] = useState<PendingRequestItem[]>(initialRequests);
  const [upcoming, setUpcoming] = useState<UpcomingCheckInItem[]>(initialUpcoming);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Double-submit prevention ref
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!rejectingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessingRef.current) {
        setRejectingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectingId]);

  const handleAccept = async (reqItem: PendingRequestItem) => {
    if (isReadOnly || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoadingId(reqItem.reservation.id);
    setFeedback(null);

    try {
      const res = await onAcceptAction(reqItem.reservation.id);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r.reservation.id !== reqItem.reservation.id));
        setUpcoming((prev) => [
          {
            reservation: { ...reqItem.reservation, status: 'confirmed', paymentStatus: 'captured' },
            property: reqItem.property,
          },
          ...prev,
        ]);
        setFeedback({
          type: 'success',
          message: `Booking accepted for ${reqItem.reservation.guestName}! Reservation code: ${reqItem.reservation.code}.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to accept booking request.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'A network error occurred while accepting the request.',
      });
    } finally {
      isProcessingRef.current = false;
      setLoadingId(null);
    }
  };

  const handleConfirmReject = async (reason: string): Promise<string | null> => {
    const targetId = rejectingId;
    if (isReadOnly || !targetId || isProcessingRef.current) return null;
    isProcessingRef.current = true;
    setLoadingId(targetId);
    setFeedback(null);

    try {
      const res = await onRejectAction(targetId, reason);
      if (!res.success) return res.error || 'Failed to reject booking request.';
      setRequests((prev) => prev.filter((r) => r.reservation.id !== targetId));
      setFeedback({
        type: 'success',
        message: 'Booking request has been declined. Payment authorization has been voided.',
      });
      setRejectingId(null);
      return null;
    } catch {
      return 'A network error occurred while rejecting the request.';
    } finally {
      isProcessingRef.current = false;
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Toast Alert Feedback */}
      {feedback && (
        <div
          role="alert"
          className={cn(
            'p-4 rounded-xl flex items-center justify-between text-sm shadow-xs',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200',
          )}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Requests Awaiting Response */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <span>⚡ Requests Awaiting Your Response</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {BOOKING_RULES.respondHours}h Countdown
            </span>
          </h2>
          <span className="text-xs text-neutral-500">
            {requests.length} request{requests.length !== 1 ? 's' : ''} pending
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">
              All caught up!
            </h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              There are no pending booking requests awaiting your response right now. New guest inquiries will appear here with an active {BOOKING_RULES.respondHours}-hour countdown timer.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-[var(--color-border-light)] text-xs uppercase font-semibold tracking-wider text-neutral-500">
                  <th className="py-3.5 px-4 sm:px-6">Guest</th>
                  <th className="py-3.5 px-4 sm:px-6">Property</th>
                  <th className="py-3.5 px-4 sm:px-6">Dates</th>
                  <th className="py-3.5 px-4 sm:px-6">Net Payout</th>
                  <th className="py-3.5 px-4 sm:px-6">Time Remaining</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {requests.map((item) => {
                  const r = item.reservation;
                  const p = item.property;
                  const isActing = loadingId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50/60 transition-colors"
                      data-request-id={r.id}
                    >
                      {/* Guest */}
                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="font-bold text-neutral-900">{r.guestName}</div>
                        <div className="text-xs text-neutral-400 italic">
                          Contact visible after confirmation
                        </div>
                      </td>

                      {/* Property */}
                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="font-medium text-neutral-900 max-w-xs truncate">
                          {p?.title || `Apartment #${r.propertyId}`}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {p ? [p.neighborhood, p.city].filter(Boolean).join(', ') : ''}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap text-neutral-700">
                        {formatUtcDateRange(r.moveInDate, r.moveOutDate)}
                        <span className="block text-xs text-neutral-400">
                          {r.nights} nights
                        </span>
                      </td>

                      {/* Net Payout */}
                      <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap">
                        <div className="font-bold text-[var(--color-brand)]">
                          {formatPrice(r.hostPayout)}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Gross: {formatPrice(r.rentAmount)}
                        </div>
                      </td>

                      {/* Time Remaining */}
                      <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            item.hoursRemaining <= 12
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200',
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {item.hoursRemaining > 0
                              ? `${item.hoursRemaining} hours left`
                              : 'Expired'}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isReadOnly || isActing}
                            onClick={() => handleAccept(item)}
                            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                          >
                            {isActing ? 'Saving...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            disabled={isReadOnly || isActing}
                            onClick={() => setRejectingId(r.id)}
                            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Upcoming Check-Ins (Next 30 Days) */}
      <UpcomingCheckIns upcoming={upcoming} />

      {rejectingId && (
        <DeclineRequestModal
          isLoading={loadingId === rejectingId}
          onCancel={() => setRejectingId(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
};
