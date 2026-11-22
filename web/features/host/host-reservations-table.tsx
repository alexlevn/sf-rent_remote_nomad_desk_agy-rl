'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  X,
  Eye,
  Monitor,
  KeyRound,
} from 'lucide-react';
import type { Reservation, Property } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { BOOKING_RULES } from '@/content/booking-rules';
import { MS_PER_HOUR, formatUtcDateRange, getSmartLockPasscode } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface HostReservationsTableProps {
  initialReservations: Reservation[];
  properties: Property[];
  todayIso: string;
  isReadOnly?: boolean;
  onAcceptAction: (
    reservationId: number
  ) => Promise<{ success: boolean; error?: string; reservation?: Reservation }>;
  onRejectAction: (
    reservationId: number,
    reason?: string
  ) => Promise<{ success: boolean; error?: string; reservation?: Reservation }>;
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
  todayIso,
  isReadOnly = false,
  onAcceptAction,
  onRejectAction,
}) => {
  const { formatPrice } = useCurrency();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<TabKey>('requests');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Detail Drawer & Reject Modal (mutually exclusive — never stacked)
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
  const [rejectingReservation, setRejectingReservation] = useState<Reservation | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [rejectModalError, setRejectModalError] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const isProcessingRef = useRef(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!detailReservation && !rejectingReservation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessingRef.current) {
        if (rejectingReservation) {
          setRejectingReservation(null);
        } else if (detailReservation) {
          setDetailReservation(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailReservation, rejectingReservation]);

  const propertyMap = new Map<number, Property>();
  properties.forEach((p) => propertyMap.set(p.id, p));

  const calculateHoursRemaining = (res: Reservation): number => {
    if (!res.respondBy) return 0;
    const diffMs = new Date(res.respondBy).getTime() - nowMs;
    return Math.max(0, Math.ceil(diffMs / MS_PER_HOUR));
  };

  // Filter reservations dynamically against server UTC todayIso
  const requestsList = reservations.filter((r) => r.status === 'pending');
  const upcomingList = reservations.filter(
    (r) => r.status === 'confirmed' && r.moveInDate >= todayIso
  );
  const currentList = reservations.filter(
    (r) =>
      r.status === 'confirmed' &&
      r.moveInDate < todayIso &&
      r.moveOutDate >= todayIso
  );
  const pastList = reservations.filter(
    (r) =>
      r.status === 'completed' ||
      (r.status === 'confirmed' && r.moveOutDate < todayIso)
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

  const renderStatusBadge = (res: Reservation, compact = false) => {
    const hoursLeft = calculateHoursRemaining(res);
    const sizeCls = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

    if (res.status === 'pending') {
      return (
        <div className={compact ? '' : 'space-y-1'}>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200',
              sizeCls,
            )}
          >
            <Clock className="w-3 h-3" />
            <span>
              {compact
                ? hoursLeft > 0
                  ? `Action Required (${hoursLeft}h)`
                  : 'Expired Window'
                : 'Action Required'}
            </span>
          </span>
          {!compact && (
            <div className="text-[10px] text-amber-700 font-semibold">
              {hoursLeft > 0 ? `Respond in ${hoursLeft}h` : 'Response window passed'}
            </div>
          )}
        </div>
      );
    }

    if (res.status === 'confirmed') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200',
            sizeCls,
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          Confirmed
        </span>
      );
    }

    if (res.status === 'completed') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-bold bg-neutral-100 text-neutral-700 border border-neutral-200',
            sizeCls,
          )}
        >
          Completed
        </span>
      );
    }

    if (res.status === 'rejected') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-bold bg-red-100 text-red-800 border border-red-200',
            sizeCls,
          )}
        >
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }

    if (res.status === 'expired') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-200',
            sizeCls,
          )}
        >
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-bold bg-neutral-100 text-neutral-600 border border-neutral-200',
          sizeCls,
        )}
      >
        Cancelled
      </span>
    );
  };

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
        setReservations((prev) =>
          prev.map((r) => (r.id === res.id ? updatedRecord : r))
        );
        if (detailReservation?.id === res.id) {
          setDetailReservation(updatedRecord);
        }
        setFeedback({
          type: 'success',
          message: `Booking accepted for ${res.guestName}! Reservation code: ${res.code}. Confirmation email has been sent to the guest.`,
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

  // Reject Action (AC-HOST-5) — always close detail drawer first (one dialog at a time)
  const handleOpenRejectModal = (res: Reservation) => {
    if (isReadOnly) return;
    setDetailReservation(null);
    setRejectingReservation(res);
    setRejectionReason(REJECTION_REASONS[0]);
    setCustomRejectionReason('');
    setRejectModalError(null);
  };

  const handleConfirmReject = async () => {
    if (isReadOnly || !rejectingReservation || isProcessingRef.current) return;

    if (rejectionReason === 'Other' && !customRejectionReason.trim()) {
      setRejectModalError('Please enter custom details for declining this booking.');
      return;
    }

    const finalReason =
      rejectionReason === 'Other'
        ? customRejectionReason.trim()
        : rejectionReason;

    isProcessingRef.current = true;
    setActionLoadingId(rejectingReservation.id);
    setRejectModalError(null);

    try {
      const response = await onRejectAction(rejectingReservation.id, finalReason);
      if (response.success) {
        const updatedRecord: Reservation = response.reservation ?? {
          ...rejectingReservation,
          status: 'rejected',
          rejectionReason: finalReason,
          paymentStatus: 'voided',
        };
        setReservations((prev) =>
          prev.map((r) => (r.id === rejectingReservation.id ? updatedRecord : r))
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

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'requests', label: 'Requests', count: requestsList.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingList.length },
    { key: 'current', label: 'Current', count: currentList.length },
    { key: 'past', label: 'Past', count: pastList.length },
    { key: 'cancelled', label: 'Cancelled / Rejected', count: cancelledList.length },
  ];

  const netPercent = 100 - BOOKING_RULES.commissionPercent;
  const detailProperty = detailReservation
    ? propertyMap.get(detailReservation.propertyId)
    : null;

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
                    <th className="py-3.5 px-4">Net Payout ({netPercent}%)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)] text-neutral-800">
                  {filteredReservations.map((res) => {
                    const property = propertyMap.get(res.propertyId);
                    const isConfirmedOrDone =
                      res.status === 'confirmed' || res.status === 'completed';
                    const isPending = res.status === 'pending';

                    return (
                      <tr key={res.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-neutral-900 whitespace-nowrap">
                          {res.code}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-neutral-900">{res.guestName}</div>
                          {isConfirmedOrDone && res.guestEmail ? (
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

                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="font-medium text-neutral-900 truncate">
                            {property?.title || `Property #${res.propertyId}`}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {property ? [property.neighborhood, property.city].filter(Boolean).join(', ') : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium">
                            {formatUtcDateRange(res.moveInDate, res.moveOutDate)}
                          </div>
                          <div className="text-[11px] text-neutral-500">{res.nights} nights</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-neutral-700">
                          {formatPrice(res.rentAmount)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[var(--color-brand)]">
                          {formatPrice(res.hostPayout)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(res, false)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAccept(res)}
                                  disabled={isReadOnly || actionLoadingId === res.id}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                                >
                                  {actionLoadingId === res.id ? 'Accepting...' : 'Accept'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(res)}
                                  disabled={isReadOnly || actionLoadingId === res.id}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setDetailReservation(res)}
                              aria-label={`View reservation ${res.code} details`}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>
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
              const isConfirmedOrDone =
                res.status === 'confirmed' || res.status === 'completed';
              const isPending = res.status === 'pending';

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-[var(--color-border-light)] p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-neutral-900">{res.code}</span>
                      <p className="text-xs font-semibold text-neutral-700">{res.guestName}</p>
                    </div>
                    <div>{renderStatusBadge(res, true)}</div>
                  </div>

                  <div className="text-xs space-y-1 text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                    <p className="font-semibold text-neutral-900 truncate">
                      {property?.title || `Property #${res.propertyId}`}
                    </p>
                    <p>
                      {formatUtcDateRange(res.moveInDate, res.moveOutDate)} ({res.nights} nights)
                    </p>
                    <div className="flex justify-between pt-1 border-t border-neutral-200">
                      <span>Gross Rent:</span>
                      <span className="font-semibold text-neutral-800">{formatPrice(res.rentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Payout ({netPercent}%):</span>
                      <span className="font-bold text-[var(--color-brand)]">
                        {formatPrice(res.hostPayout)}
                      </span>
                    </div>
                  </div>

                  {res.rejectionReason && (
                    <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                      <strong>Reason:</strong> {res.rejectionReason}
                    </div>
                  )}

                  {isConfirmedOrDone && res.guestEmail && (
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

                  <div className="flex items-center gap-2 pt-1">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAccept(res)}
                          disabled={isReadOnly || actionLoadingId === res.id}
                          className="flex-1 min-h-10 text-xs font-semibold rounded-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 text-center"
                        >
                          {actionLoadingId === res.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(res)}
                          disabled={isReadOnly || actionLoadingId === res.id}
                          className="flex-1 min-h-10 text-xs font-semibold rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-center"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailReservation(res)}
                      className="flex-1 min-h-10 text-xs font-semibold rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors text-center"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reservation Detail Drawer */}
      {detailReservation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="host-res-detail-title"
          className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailReservation(null);
            }
          }}
        >
          <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--color-border-light)]">
                <div>
                  <span className="text-xs font-mono text-neutral-500">
                    {detailReservation.code}
                  </span>
                  <h3 id="host-res-detail-title" className="text-lg font-bold text-neutral-900">
                    Reservation Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailReservation(null)}
                  aria-label="Close reservation details"
                  className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Status</span>
                {renderStatusBadge(detailReservation, false)}
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                <div className="font-bold text-neutral-900 text-sm">
                  {detailProperty?.title || `Property #${detailReservation.propertyId}`}
                </div>
                <div className="text-neutral-600">
                  {formatUtcDateRange(detailReservation.moveInDate, detailReservation.moveOutDate)}{' '}
                  • {detailReservation.nights} nights
                </div>
                {detailReservation.status === 'confirmed' && (
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-neutral-500 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      Smart Lock Code
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      {getSmartLockPasscode(detailReservation.id)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold uppercase tracking-wider text-neutral-500">Guest</div>
                <div className="font-semibold text-sm text-neutral-900">
                  {detailReservation.guestName}
                </div>
                {(detailReservation.status === 'confirmed' ||
                  detailReservation.status === 'completed') &&
                detailReservation.guestEmail ? (
                  <div className="space-y-1 text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{detailReservation.guestEmail}</span>
                    </div>
                    {detailReservation.guestPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{detailReservation.guestPhone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-neutral-400 italic">
                    Guest contact details unlock once the reservation is confirmed.
                  </p>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                  <span>Workstation Setup</span>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-700">
                  {detailReservation.workstationConfig?.packageId
                    ? `Selected package: ${detailReservation.workstationConfig.packageId}`
                    : detailReservation.workstationFee > 0
                    ? `Custom workstation upgrade (+${formatPrice(detailReservation.workstationFee)})`
                    : 'Standard Comfort Base (Included)'}
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-[var(--color-border-light)] pt-4">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Gross Rent</span>
                  <span className="font-medium text-neutral-900">
                    {formatPrice(detailReservation.rentAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">
                    Platform Commission ({BOOKING_RULES.commissionPercent}%)
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatPrice(detailReservation.commissionAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-200">
                  <span className="text-neutral-900">Net Host Payout</span>
                  <span className="text-[var(--color-brand)]">
                    {formatPrice(detailReservation.hostPayout)}
                  </span>
                </div>
              </div>

              {detailReservation.rejectionReason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  <strong className="block mb-0.5">Decline / Cancellation Reason:</strong>
                  {detailReservation.rejectionReason}
                </div>
              )}
            </div>

            {detailReservation.status === 'pending' && !isReadOnly && (
              <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border-light)]">
                <button
                  type="button"
                  disabled={actionLoadingId === detailReservation.id}
                  onClick={() => handleAccept(detailReservation)}
                  className="flex-1 min-h-10 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === detailReservation.id ? 'Accepting...' : 'Accept Request'}
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === detailReservation.id}
                  onClick={() => handleOpenRejectModal(detailReservation)}
                  className="flex-1 min-h-10 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal Dialog (AC-HOST-5) */}
      {rejectingReservation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessingRef.current) {
              setRejectingReservation(null);
            }
          }}
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
                aria-label="Close reject modal"
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs sm:text-sm text-neutral-600">
                Are you sure you want to decline request{' '}
                <strong className="text-neutral-900">{rejectingReservation.code}</strong> from{' '}
                <strong className="text-neutral-900">{rejectingReservation.guestName}</strong>?
              </p>

              {rejectModalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejectModalError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="rejection-reason-select"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Reason for rejection (Required)
                </label>
                <select
                  id="rejection-reason-select"
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setRejectModalError(null);
                  }}
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
                  <label
                    htmlFor="custom-rejection-reason"
                    className="block text-xs font-semibold text-neutral-700 mb-1"
                  >
                    Please provide custom details:
                  </label>
                  <textarea
                    id="custom-rejection-reason"
                    rows={3}
                    required
                    value={customRejectionReason}
                    onChange={(e) => {
                      setCustomRejectionReason(e.target.value);
                      if (rejectModalError) setRejectModalError(null);
                    }}
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
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectingReservation.id}
                className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
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
