'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2 } from 'lucide-react';
import type { Reservation, Property, HostProfile } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReservationCard } from './reservation-card';
import { formatDatesDisplay, getDaysUntilMoveIn } from './guest-utils';
import { ReservationDetailDrawer } from './reservation-detail-drawer';
import { CancelBookingModal } from './cancel-booking-modal';
import { cancelBookingAction } from '@/app/guests/reservations/actions';

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

  // Tab counts
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
    const res = await cancelBookingAction(id, reason);
    if (!res.success) {
      throw new Error(res.error || 'Failed to cancel reservation');
    }

    // Update local state optimistically
    setReservations((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'cancelled',
              paymentStatus: 'refunded',
              cancelledBy: 'guest',
              rejectionReason: reason,
            }
          : item
      )
    );

    setToastMessage(`Reservation #${res.reservation?.code || id} has been successfully cancelled.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const getStatusBadge = (res: Reservation) => {
    switch (res.status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending (38h left)</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'expired':
        return <Badge variant="neutral">Expired</Badge>;
      default:
        return <Badge variant="neutral">{res.status}</Badge>;
    }
  };

  return (
    <div>
      {/* Toast notification */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center justify-between shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none border-b border-[var(--color-border-light)]">
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
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-neutral-900 text-white font-semibold'
                : 'text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] hover:bg-neutral-100'
            }`}
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
            You don&apos;t have any bookings in this view. Browse available furnished apartments with
            dedicated workspaces to plan your next stay.
          </p>
          <Link
            href="/c/furnished-apartments-madrid"
            className="btn btn-primary btn-sm btn-pill inline-flex items-center"
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
                  <tr className="border-b border-[var(--color-border-light)] bg-[#faf8f5] text-[var(--color-text-on-light-muted)] font-semibold uppercase text-[11px] tracking-wider">
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
                  {filteredReservations.map((res) => {
                    const prop = propertiesMap[res.propertyId];
                    const host = prop ? hostsMap[prop.hostId] : null;
                    const hostName = host?.displayName || 'Casa Urbana Stays';
                    const propTitle = prop?.title || 'Sky Home Apartment';

                    const isConfirmed = res.status === 'confirmed';
                    const isPending = res.status === 'pending';
                    const isCompleted = res.status === 'completed';
                    const daysUntil = getDaysUntilMoveIn(res.moveInDate);
                    const canCancelConfirmed = isConfirmed && daysUntil >= 14;
                    const isConfirmedLocked = isConfirmed && daysUntil < 14;

                    return (
                      <tr
                        key={res.id}
                        className="hover:bg-neutral-50/70 transition-colors"
                      >
                        <td className="py-4 px-5 font-semibold text-[var(--color-text-on-light)] max-w-xs truncate">
                          <button
                            onClick={() => setSelectedDrawerReservation(res)}
                            className="text-left hover:text-[var(--color-brand)] transition-colors cursor-pointer truncate max-w-full block"
                          >
                            {propTitle}
                          </button>
                          <span className="text-[11px] font-normal text-neutral-400 block font-mono">
                            #{res.code}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{prop?.city || 'Madrid'}</td>
                        <td className="py-4 px-4 text-neutral-600 whitespace-nowrap">
                          {formatDatesDisplay(res.moveInDate, res.moveOutDate)}
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{hostName}</td>
                        <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)]">
                          {formatPrice(res.totalAmount)}
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(res)}</td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDrawerReservation(res)}
                              className="text-xs h-8 px-2.5"
                            >
                              Receipt
                            </Button>

                            {isPending && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCancelReservation(res)}
                                className="text-xs h-8 px-2.5 text-[var(--color-error)] border-red-200 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            )}

                            {canCancelConfirmed && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCancelReservation(res)}
                                className="text-xs h-8 px-2.5 text-[var(--color-error)] border-red-200 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            )}

                            {isConfirmedLocked && (
                              <span className="text-[11px] text-[var(--color-text-on-light-muted)] italic max-w-[140px] truncate block text-right">
                                Locked (&lt;14d)
                              </span>
                            )}

                            {isCompleted && (
                              <Button
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
            {filteredReservations.map((res) => {
              const prop = propertiesMap[res.propertyId] || null;
              const host = prop ? hostsMap[prop.hostId] || null : null;
              return (
                <ReservationCard
                  key={res.id}
                  reservation={res}
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

      {/* Reservation Detail Drawer / Modal */}
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
