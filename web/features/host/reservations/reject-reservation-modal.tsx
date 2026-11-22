'use client';

import React, { useState } from 'react';
import { AlertCircle, X, XCircle } from 'lucide-react';
import type { Reservation } from '@/lib/types';
import { cn } from '@/lib/utils';

const REJECTION_REASONS = [
  'Dates unavailable due to scheduled repairs or maintenance',
  'Property not available for the requested stay duration',
  'Cannot accommodate requested workstation hardware configuration',
  'Offline prior commitment or owner personal stay',
  'Other',
];

const OTHER_REASON = 'Other';
const FIELD_CLASS =
  'w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all';

interface RejectReservationModalProps {
  reservation: Reservation;
  isLoading: boolean;
  onCancel: () => void;
  // Resolves to an error message to show, or null when the rejection went through
  onConfirm: (reason: string) => Promise<string | null>;
}

export function RejectReservationModal({ reservation, isLoading, onCancel, onConfirm }: RejectReservationModalProps) {
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (reason === OTHER_REASON && !customReason.trim()) {
      setError('Please enter custom details for declining this booking.');
      return;
    }
    setError(null);
    const failure = await onConfirm(reason === OTHER_REASON ? customReason.trim() : reason);
    if (failure) setError(failure);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
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
            onClick={onCancel}
            aria-label="Close reject modal"
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs sm:text-sm text-neutral-600">
            Are you sure you want to decline request <strong className="text-neutral-900">{reservation.code}</strong>{' '}
            from <strong className="text-neutral-900">{reservation.guestName}</strong>?
          </p>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="rejection-reason-select" className="block text-xs font-semibold text-neutral-700 mb-1">
              Reason for rejection (Required)
            </label>
            <select
              id="rejection-reason-select"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              className={FIELD_CLASS}
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === OTHER_REASON && (
            <div>
              <label htmlFor="custom-rejection-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                Please provide custom details:
              </label>
              <textarea
                id="custom-rejection-reason"
                rows={3}
                required
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter reason for guest..."
                className={cn(FIELD_CLASS, 'resize-none')}
              />
            </div>
          )}

          <p className="text-[11px] text-neutral-500">
            The guest will be notified of this reason in their portal. Their pre-authorized card hold will be released
            immediately.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-light)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}
