'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  KeyRound,
  User,
  ArrowRight,
} from 'lucide-react';
import type { Reservation, Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { BOOKING_RULES } from '@/content/booking-rules';
import { formatUtcDateRange, getSmartLockPasscode } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PendingRequestItem {
  reservation: Reservation;
  property: Property | null;
  hoursRemaining: number;
}

export interface UpcomingCheckInItem {
  reservation: Reservation;
  property: Property | null;
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
  const [rejectionReason, setRejectionReason] = useState('Dates unavailable due to scheduled repairs');
  const [rejectModalError, setRejectModalError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Double-submit prevention ref
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!rejectingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessingRef.current) {
        setRejectingId(null);
        setRejectModalError(null);
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

  const handleConfirmReject = async () => {
    if (isReadOnly || !rejectingId || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoadingId(rejectingId);
    setRejectModalError(null);
    setFeedback(null);

    const targetId = rejectingId;
    try {
      const res = await onRejectAction(targetId, rejectionReason);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r.reservation.id !== targetId));
        setFeedback({
          type: 'success',
          message: 'Booking request has been declined. Payment authorization has been voided.',
        });
        setRejectingId(null);
      } else {
        setRejectModalError(res.error || 'Failed to reject booking request.');
      }
    } catch {
      setRejectModalError('A network error occurred while rejecting the request.');
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
                            onClick={() => {
                              setRejectModalError(null);
                              setRejectingId(r.id);
                            }}
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <span>📅 Upcoming Check-Ins</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              Next 30 Days
            </span>
          </h2>
          <Link
            href="/host/calendar"
            className="text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1"
          >
            <span>View Full Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">
              No check-ins in the next 30 days
            </h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Your confirmed guest stays will show up here along with check-in instructions and smart lock access codes.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-[var(--color-border-light)] text-xs uppercase font-semibold tracking-wider text-neutral-500">
                  <th className="py-3.5 px-4 sm:px-6">Guest</th>
                  <th className="py-3.5 px-4 sm:px-6">Property</th>
                  <th className="py-3.5 px-4 sm:px-6">Check-In Date</th>
                  <th className="py-3.5 px-4 sm:px-6">Duration</th>
                  <th className="py-3.5 px-4 sm:px-6">Smart Lock</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {upcoming.map((item) => {
                  const r = item.reservation;
                  const p = item.property;

                  return (
                    <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{r.guestName}</span>
                        </div>
                        {r.guestEmail && (
                          <div className="text-xs text-neutral-400">{r.guestEmail}</div>
                        )}
                      </td>

                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="font-medium text-neutral-900 max-w-xs truncate">
                          {p?.title || `Apartment #${r.propertyId}`}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {p ? [p.neighborhood, p.city].filter(Boolean).join(', ') : ''}
                        </div>
                      </td>

                      <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap font-medium text-neutral-800">
                        {r.moveInDate}
                      </td>

                      <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap text-neutral-600">
                        {r.nights} nights
                      </td>

                      <td className="py-4 px-4 sm:px-6 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                          <KeyRound className="w-3 h-3 text-neutral-500" />
                          <span>{getSmartLockPasscode(r.id)}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmed</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-reject-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessingRef.current) {
              setRejectingId(null);
              setRejectModalError(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[var(--color-border-light)] animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6" />
            </div>

            <h3 id="dashboard-reject-modal-title" className="text-lg font-bold text-neutral-900 mb-2">
              Decline Booking Request?
            </h3>
            <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
              Declining this request will immediately release the guest&apos;s card authorization and unblock the dates. Please specify the reason:
            </p>

            {rejectModalError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rejectModalError}</span>
              </div>
            )}

            <div className="mb-5">
              <label
                htmlFor="dashboard-reject-reason"
                className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
              >
                Reason for decline
              </label>
              <select
                id="dashboard-reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-sm border border-[var(--color-border-light)] rounded-lg p-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
              >
                <option value="Dates unavailable due to scheduled repairs">
                  Dates unavailable due to scheduled maintenance
                </option>
                <option value="Apartment reserved through long-term channel">
                  Apartment reserved through long-term channel
                </option>
                <option value="Guest requested configuration unavailable">
                  Workstation configuration not available
                </option>
                <option value="Pricing adjustment required">
                  Pricing adjustment required
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loadingId === rejectingId}
                onClick={() => {
                  setRejectingId(null);
                  setRejectModalError(null);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingId === rejectingId}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loadingId === rejectingId ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
