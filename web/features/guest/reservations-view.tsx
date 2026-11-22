'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2 } from 'lucide-react';
import type { Reservation, Property, HostProfile } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { BOOKING_RULES } from '@/content/booking-rules';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReservationCard } from './reservation-card';
import {
  formatDatesDisplay,
  formatRespondByCountdown,
  getDaysUntilMoveIn,
} from './guest-utils';
import { ReservationDetailDrawer } from './reservation-detail-drawer';
import { CancelBookingModal } from './cancel-booking-modal';
import { cancelBookingAction } from '@/app/guests/reservations/actions';

const TOAST_DURATION_MS = 5000;

export interface ReservationsViewProps {
  initialReservations: Reservation[];
  propertiesMap: Record<number, Property>;
  hostsMap: Record<number, HostProfile>;
}

type TabKey = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'rejected' | 'expired';

export const ReservationsView: React.FC<ReservationsViewProps> = ({
  initialReservations,
  propertiesMap,
  hostsMap,
}) => {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedDrawerReservation, setSelectedDrawerReservation] = useState<Reservation | null>(
    null
  );
  const [selectedCancelReservation, setSelectedCancelReservation] = useState<Reservation | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setReservations(initialReservations);
  }, [initialReservations]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const counts = {
    all: reservations.length,
    confirmed: reservations.filter((r) => r.status === 'confirmed').length,
    pending: reservations.filter((r) => r.status === 'pending').length,
    completed: reservations.filter((r) => r.status === 'completed').length,
    cancelled: reservations.filter((r) => r.status === 'cancelled').length,
    rejected: reservations.filter((r) => r.status === 'rejected').length,
    expired: reservations.filter((r) => r.status === 'expired').length,
  };

  const filteredReservations = reservations.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const handleConfirmCancel = async (id: number, reason: string) => {
    const cancelResult = await cancelBookingAction(id, reason);
    if (!cancelResult.success || !cancelResult.reservation) {
      throw new Error(cancelResult.error || 'Failed to cancel reservation');
    }

    const updatedReservation = cancelResult.reservation;
    setReservations((prev) =>
      prev.map((item) => (item.id === id ? updatedReservation : item))
    );

    setToastMessage(
      `Reservation #${updatedReservation.code || id} has been successfully cancelled.`
    );
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    router.refresh();
  };

  const getStatusBadge = (booking: Reservation) => {
    switch (booking.status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending': {
        const countdown = formatRespondByCountdown(booking.respondBy);
        return <Badge variant="warning">Pending {countdown}</Badge>;
      }
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'expired':
        return <Badge variant="neutral">Expired</Badge>;
      default:
        return <Badge variant="neutral">{booking.status}</Badge>;
    }
  };

  return (
    <div>
      {/* Toast notification */}
      {toastMessage && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-xs sm:text-sm text-[var(--color-success)] flex items-center justify-between shadow-xs transition-all"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToastMessage(null)}
            className="inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 text-[var(--color-success)] hover:opacity-80 font-bold ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs bar */}
      <div
        role="tablist"
        aria-label="Filter reservations by status"
        className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none border-b border-[var(--color-border-light)]"
      >
        {(
          [
            { key: 'all', label: `All Stays (${counts.all})` },
            { key: 'confirmed', label: `Confirmed (${counts.confirmed})` },
            { key: 'pending', label: `Pending (${counts.pending})` },
            { key: 'completed', label: `Completed (${counts.completed})` },
            { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
            { key: 'rejected', label: `Rejected (${counts.rejected})` },
            { key: 'expired', label: `Expired (${counts.expired})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3.5 py-2 min-h-10 sm:min-h-9 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'bg-[var(--color-bg-dark)] text-white font-semibold'
                : 'text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs">
          <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-1">
            No reservations found
          </h3>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mb-6">
            You don&apos;t have any bookings in this view. Browse available furnished apartments
            with dedicated workspaces to plan your next stay.
          </p>
          <Link
            href="/c/furnished-apartments-madrid"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Browse Apartments
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View (≥ 768px) */}
          <div className="hidden md:block bg-white border border-[var(--color-border-light)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-bg-light-subtle)] text-[var(--color-text-on-light-muted)] font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-5">Property</th>
                    <th className="py-3.5 px-4">City</th>
                    <th className="py-3.5 px-4">Dates</th>
                    <th className="py-3.5 px-4">Host</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)] text-[var(--color-text-on-light)]">
                  {filteredReservations.map((booking) => {
                    const prop = propertiesMap[booking.propertyId];
                    const host = prop ? hostsMap[prop.hostId] : null;
                    const hostName = host?.displayName || 'Verified Host';
                    const propTitle = prop?.title || 'Furnished Apartment';

                    const isConfirmed = booking.status === 'confirmed';
                    const isPending = booking.status === 'pending';
                    const isCompleted = booking.status === 'completed';
                    const freeCancelDays = booking.freeCancelDays ?? BOOKING_RULES.freeCancelDays;
                    const daysUntil = getDaysUntilMoveIn(booking.moveInDate);
                    const canCancelConfirmed = isConfirmed && daysUntil >= freeCancelDays;
                    const isConfirmedLocked = isConfirmed && daysUntil < freeCancelDays;

                    return (
                      <tr key={booking.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-4 px-5 font-semibold text-[var(--color-text-on-light)] max-w-xs truncate">
                          <button
                            type="button"
                            onClick={() => setSelectedDrawerReservation(booking)}
                            className="text-left hover:text-[var(--color-brand)] transition-colors cursor-pointer truncate max-w-full block"
                          >
                            {propTitle}
                          </button>
                          <span className="text-[11px] font-normal text-neutral-400 block font-mono">
                            #{booking.code}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{prop?.city || '—'}</td>
                        <td className="py-4 px-4 text-neutral-600 whitespace-nowrap">
                          {formatDatesDisplay(booking.moveInDate, booking.moveOutDate)}
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{hostName}</td>
                        <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)]">
                          {formatPrice(booking.totalAmount)}
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(booking)}</td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDrawerReservation(booking)}
                              className="text-xs h-8 px-2.5"
                            >
                              Receipt
                            </Button>

                            {isPending && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCancelReservation(booking)}
                                className="text-xs h-8 px-2.5 text-[var(--color-error)] border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)]"
                              >
                                Cancel
                              </Button>
                            )}

                            {canCancelConfirmed && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCancelReservation(booking)}
                                className="text-xs h-8 px-2.5 text-[var(--color-error)] border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)]"
                              >
                                Cancel
                              </Button>
                            )}

                            {isConfirmedLocked && (
                              <span
                                title="Contact support to change this booking"
                                className="text-[11px] text-[var(--color-text-on-light-muted)] italic max-w-[180px] truncate block text-right"
                              >
                                Contact support to change this booking
                              </span>
                            )}

                            {isCompleted && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled
                                className="text-xs h-8 px-2.5 opacity-60"
                              >
                                Review (Soon)
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack (< 768px) */}
          <div className="md:hidden space-y-4">
            {filteredReservations.map((booking) => {
              const prop = propertiesMap[booking.propertyId] || null;
              const host = prop ? hostsMap[prop.hostId] || null : null;
              return (
                <ReservationCard
                  key={booking.id}
                  reservation={booking}
                  property={prop}
                  host={host}
                  onViewDetails={(r) => setSelectedDrawerReservation(r)}
                  onCancelClick={(r) => setSelectedCancelReservation(r)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Reservation Detail Drawer */}
      {selectedDrawerReservation && (
        <ReservationDetailDrawer
          isOpen={Boolean(selectedDrawerReservation)}
          onClose={() => setSelectedDrawerReservation(null)}
          reservation={selectedDrawerReservation}
          property={propertiesMap[selectedDrawerReservation.propertyId] || null}
          host={
            propertiesMap[selectedDrawerReservation.propertyId]
              ? hostsMap[propertiesMap[selectedDrawerReservation.propertyId].hostId] || null
              : null
          }
          onCancelClick={(r) => setSelectedCancelReservation(r)}
        />
      )}

      {/* Cancel Booking Modal */}
      {selectedCancelReservation && (
        <CancelBookingModal
          isOpen={Boolean(selectedCancelReservation)}
          onClose={() => setSelectedCancelReservation(null)}
          reservation={selectedCancelReservation}
          propertyTitle={propertiesMap[selectedCancelReservation.propertyId]?.title}
          onConfirmCancel={handleConfirmCancel}
        />
      )}
    </div>
  );
};
