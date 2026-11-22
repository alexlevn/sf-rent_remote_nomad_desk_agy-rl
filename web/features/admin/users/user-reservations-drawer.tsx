'use client';

import React from 'react';
import { AlertTriangle, BookmarkCheck, Calendar, X } from 'lucide-react';
import type { Property, Reservation, User } from '@/lib/types';
import { ReservationStatusPill } from '@/features/admin/reservations/reservation-badges';

interface UserReservationsDrawerProps {
  user: User;
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  propertyById: Map<number, Property>;
  onClose: () => void;
}

export function UserReservationsDrawer({
  user,
  reservations,
  loading,
  error,
  propertyById,
  onClose,
}: UserReservationsDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        data-testid="user-reservations-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Reservations for ${user.email}`}
        className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto border-l border-[var(--color-border-light)] flex flex-col justify-between"
      >
        <div className="space-y-5">
          {/* Drawer Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--color-border-light)]">
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-on-light)]">
                User Reservations
              </h3>
              <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                {user.firstName || user.lastName
                  ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() + ' · '
                  : ''}
                <span className="font-mono">{user.email}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reservations drawer"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
              <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
              <span>Loading user bookings...</span>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : reservations.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
              <BookmarkCheck className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="font-semibold text-neutral-700">No bookings found</p>
              <p className="text-neutral-400">
                This user has not made any reservations on NomadDesk yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
                {reservations.length}{' '}
                {reservations.length === 1 ? 'Reservation' : 'Reservations'}
              </div>
              {reservations.map((res) => {
                const prop = propertyById.get(res.propertyId);
                const totalUSD = Math.round((res.totalAmount || 0) / 100);
                return (
                  <div
                    key={res.id}
                    data-testid={`user-drawer-reservation-${res.code}`}
                    className="p-4 rounded-xl border border-[var(--color-border-light)] bg-neutral-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-brand)]">
                        #{res.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <ReservationStatusPill status={res.status} size="sm" />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-neutral-900">
                        {prop ? prop.title : `Property #${res.propertyId}`}
                      </div>
                      {prop?.city && (
                        <div className="text-xs text-neutral-500">{prop.city}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs border-t border-[var(--color-border-light)]">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>
                          {res.moveInDate} → {res.moveOutDate} ({res.nights}n)
                        </span>
                      </div>
                      <div className="font-bold text-neutral-900">
                        ${totalUSD.toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-[var(--color-border-light)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
