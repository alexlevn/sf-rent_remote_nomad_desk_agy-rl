'use client';

import React, { useState, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  X,
} from 'lucide-react';
import type { Reservation, Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';

export interface HostReservationsTableProps {
  initialReservations: Reservation[];
  properties: Property[];
  onAcceptAction: (reservationId: number) => Promise<{ success: boolean; error?: string }>;
  onRejectAction: (
    reservationId: number,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

type TabKey = 'requests' | 'upcoming' | 'current' | 'past' | 'cancelled';

const REJECTION_REASONS = [
  'Dates unavailable due to scheduled repairs or maintenance',
  'Property not available for the requested stay duration',
  'Cannot accommodate requested workstation hardware configuration',
  'Offline prior commitment or owner personal stay',
  'Other',
];

export const HostReservationsTable: React.FC<HostReservationsTableProps> = ({
  initialReservations,
  properties,
  onAcceptAction,
  onRejectAction,
}) => {
  const { formatPrice } = useCurrency();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<TabKey>('requests');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Reject modal state
  const [rejectingReservation, setRejectingReservation] = useState<Reservation | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [rejectModalError, setRejectModalError] = useState<string | null>(null);

  // Loading & Double-submit guards
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const isProcessingRef = useRef(false);

  // Property lookup map
  const propertyMap = new Map<number, Property>();
  properties.forEach((p) => propertyMap.set(p.id, p));

  // Date helpers
  const formatDatesRange = (moveInDate: string, moveOutDate: string) => {
    try {
      const dIn = new Date(moveInDate);
      const dOut = new Date(moveOutDate);
      const inStr = dIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const outStr = dOut.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${inStr} – ${outStr}`;
    } catch {
      return `${moveInDate} – ${moveOutDate}`;
    }
  };

  const calculateHoursRemaining = (res: Reservation) => {
    if (res.respondBy) {
      const diffMs =
        new Date(res.respondBy).getTime() -
        new Date(res.createdAt || '2026-11-20T12:00:00Z').getTime();
      const calcHours = Math.round(diffMs / (3600 * 1000));
      return calcHours > 0 ? calcHours : 24;
    }
    return 36;
  };

  // Filter reservations by tab
  const todayStr = '2026-11-20'; // Reference date baseline
  const requestsList = reservations.filter((r) => r.status === 'pending');
  const upcomingList = reservations.filter(
    (r) => r.status === 'confirmed' && r.moveInDate >= todayStr
  );
  const currentList = reservations.filter(
    (r) => r.status === 'confirmed' && r.moveInDate < todayStr && r.moveOutDate >= todayStr
  );
  const pastList = reservations.filter(
    (r) => r.status === 'completed' || (r.status === 'confirmed' && r.moveOutDate < todayStr)
  );
  const cancelledList = reservations.filter(
    (r) => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired'
  );

  const getFilteredReservations = () => {
    switch (activeTab) {
      case 'requests':
        return requestsList;
      case 'upcoming':
        return upcomingList;
      case 'current':
        return currentList;
      case 'past':
        return pastList;
      case 'cancelled':
        return cancelledList;
      default:
        return reservations;
    }
  };

  const filteredReservations = getFilteredReservations();

  // Accept Action (AC-HOST-4)
  const handleAccept = async (res: Reservation) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setActionLoadingId(res.id);
    setFeedback(null);

    try {
      const response = await onAcceptAction(res.id);
      if (response.success) {
        setReservations((prev) =>
          prev.map((r) =>
            r.id === res.id ? { ...r, status: 'confirmed', paymentStatus: 'captured' } : r
          )
        );
        setFeedback({
          type: 'success',
          message: `Booking accepted for ${res.guestName}! Reservation code: ${res.code}. Confirmation email sent via Mailpit (http://localhost:18188).`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: response.error || 'Failed to accept booking request.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'A network error occurred while accepting the booking request.',
      });
    } finally {
      isProcessingRef.current = false;
      setActionLoadingId(null);
    }
  };

  // Reject Action (AC-HOST-5)
  const handleOpenRejectModal = (res: Reservation) => {
    setRejectingReservation(res);
    setRejectionReason(REJECTION_REASONS[0]);
    setCustomRejectionReason('');
    setRejectModalError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingReservation || isProcessingRef.current) return;

    const finalReason =
      rejectionReason === 'Other'
        ? customRejectionReason.trim() || 'Property unavailable'
        : rejectionReason;

    if (!finalReason) {
      setRejectModalError('Please specify a rejection reason.');
      return;
    }

    isProcessingRef.current = true;
    setActionLoadingId(rejectingReservation.id);
    setRejectModalError(null);

    try {
      const response = await onRejectAction(rejectingReservation.id, finalReason);
      if (response.success) {
        setReservations((prev) =>
          prev.map((r) =>
            r.id === rejectingReservation.id
              ? {
                  ...r,
                  status: 'rejected',
                  rejectionReason: finalReason,
                  paymentStatus: 'voided',
                }
              : r
          )
        );
        setFeedback({
          type: 'success',
          message: `Booking request ${rejectingReservation.code} was rejected. Card authorization voided.`,
        });
        setRejectingReservation(null);
      } else {
        setRejectModalError(response.error || 'Failed to reject booking request.');
      }
    } catch {
      setRejectModalError('A network error occurred while rejecting the booking request.');
    } finally {
      isProcessingRef.current = false;
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
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
            className="text-neutral-400 hover:text-neutral-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-1 border-b border-[var(--color-border-light)]">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <span>Requests</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {requestsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {upcomingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'current'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <span>Current</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'current' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {currentList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'past'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <span>Past</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'past' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {pastList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'cancelled'
              ? 'bg-[var(--color-brand)] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          <span>Cancelled / Rejected</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {cancelledList.length}
          </span>
        </button>
      </div>

      {/* Empty State */}
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
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[var(--color-border-light)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-[var(--color-border-light)] text-neutral-500 font-semibold">
                    <th className="py-3.5 px-4">Booking ID</th>
                    <th className="py-3.5 px-4">Guest</th>
                    <th className="py-3.5 px-4">Property</th>
                    <th className="py-3.5 px-4">Stay Dates</th>
                    <th className="py-3.5 px-4">Gross Rent</th>
                    <th className="py-3.5 px-4">Net Payout (90%)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)] text-neutral-800">
                  {filteredReservations.map((res) => {
                    const property = propertyMap.get(res.propertyId);
                    const isConfirmed = res.status === 'confirmed';
                    const isPending = res.status === 'pending';
                    const hoursLeft = calculateHoursRemaining(res);

                    return (
                      <tr key={res.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Booking Code */}
                        <td className="py-3.5 px-4 font-bold text-neutral-900 whitespace-nowrap">
                          {res.code}
                        </td>

                        {/* Guest & Contact Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-neutral-900">{res.guestName}</div>
                          {isConfirmed ? (
                            <div className="text-[11px] text-neutral-500 space-y-0.5 mt-0.5">
                              <div className="flex items-center gap-1 text-emerald-700">
                                <Mail className="w-3 h-3" />
                                <span>{res.guestEmail}</span>
                              </div>
                              {res.guestPhone && (
                                <div className="flex items-center gap-1 text-neutral-600">
                                  <Phone className="w-3 h-3" />
                                  <span>{res.guestPhone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-neutral-400 italic mt-0.5">
                              Contact visible after confirmation
                            </div>
                          )}
                        </td>

                        {/* Property */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="font-medium text-neutral-900 truncate">
                            {property?.title || `Property #${res.propertyId}`}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {property ? `${property.neighborhood}, ${property.city}` : ''}
                          </div>
                        </td>

                        {/* Stay Dates */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium">
                            {formatDatesRange(res.moveInDate, res.moveOutDate)}
                          </div>
                          <div className="text-[11px] text-neutral-500">{res.nights} nights</div>
                        </td>

                        {/* Gross Rent */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-neutral-700">
                          {formatPrice(res.totalAmount)}
                        </td>

                        {/* Net Payout */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[var(--color-brand)]">
                          {formatPrice(res.hostPayout)}
                        </td>

                        {/* Status Badge & Countdown */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPending && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Action Required
                              </span>
                              <div className="text-[10px] text-amber-700 font-semibold">
                                Respond in {hoursLeft}h
                              </div>
                            </div>
                          )}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Confirmed
                            </span>
                          )}
                          {res.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                              Completed
                            </span>
                          )}
                          {res.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                          {res.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                              Cancelled
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleAccept(res)}
                                disabled={actionLoadingId === res.id}
                                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white transition-colors disabled:opacity-50 shadow-xs"
                              >
                                {actionLoadingId === res.id ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(res)}
                                disabled={actionLoadingId === res.id}
                                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-400">
                              {res.rejectionReason && (
                                <span
                                  className="text-[11px] text-neutral-500 cursor-help"
                                  title={res.rejectionReason}
                                >
                                  Reason: {res.rejectionReason.slice(0, 20)}...
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (< 768px / 390px) */}
          <div className="md:hidden space-y-3">
            {filteredReservations.map((res) => {
              const property = propertyMap.get(res.propertyId);
              const isConfirmed = res.status === 'confirmed';
              const isPending = res.status === 'pending';
              const hoursLeft = calculateHoursRemaining(res);

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-[var(--color-border-light)] p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-neutral-900">{res.code}</span>
                      <p className="text-xs font-semibold text-neutral-700">{res.guestName}</p>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Action Required ({hoursLeft}h)
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Confirmed
                        </span>
                      )}
                      {res.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          Rejected
                        </span>
                      )}
                      {res.status === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Property & Stay */}
                  <div className="text-xs space-y-1 text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                    <p className="font-semibold text-neutral-900 truncate">
                      {property?.title || `Property #${res.propertyId}`}
                    </p>
                    <p>{formatDatesRange(res.moveInDate, res.moveOutDate)} ({res.nights} nights)</p>
                    <div className="flex justify-between pt-1 border-t border-neutral-200">
                      <span>Net Payout:</span>
                      <span className="font-bold text-[var(--color-brand)]">{formatPrice(res.hostPayout)}</span>
                    </div>
                  </div>

                  {/* Guest Contact Info if confirmed */}
                  {isConfirmed && (
                    <div className="text-xs bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Mail className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{res.guestEmail}</span>
                      </div>
                      {res.guestPhone && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{res.guestPhone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending Action Buttons */}
                  {isPending && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAccept(res)}
                        disabled={actionLoadingId === res.id}
                        className="flex-1 py-2 text-xs font-semibold rounded-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 text-center"
                      >
                        {actionLoadingId === res.id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(res)}
                        disabled={actionLoadingId === res.id}
                        className="flex-1 py-2 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-center"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reject Modal Dialog (AC-HOST-5) */}
      {rejectingReservation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border-light)] relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)]">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <h3 id="reject-modal-title" className="text-base font-bold text-neutral-900">
                  Reject Booking Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingReservation(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs sm:text-sm text-neutral-600">
                Are you sure you want to decline request <strong className="text-neutral-900">{rejectingReservation.code}</strong> from <strong className="text-neutral-900">{rejectingReservation.guestName}</strong>?
              </p>

              {rejectModalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejectModalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="rejection-reason-select" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason for rejection (Required)
                </label>
                <select
                  id="rejection-reason-select"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {rejectionReason === 'Other' && (
                <div>
                  <label htmlFor="custom-rejection-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Please provide custom details:
                  </label>
                  <textarea
                    id="custom-rejection-reason"
                    rows={3}
                    required
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="Enter reason for guest..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all resize-none"
                  />
                </div>
              )}

              <p className="text-[11px] text-neutral-500">
                The guest will be notified of this reason in their portal. Their pre-authorized card hold will be released immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-light)]">
              <button
                type="button"
                onClick={() => setRejectingReservation(null)}
                disabled={actionLoadingId === rejectingReservation.id}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectingReservation.id}
                className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {actionLoadingId === rejectingReservation.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
