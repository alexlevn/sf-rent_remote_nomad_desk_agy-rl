'use client';

import React, { useState, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Reservation } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  propertyTitle?: string;
  onConfirmCancel: (id: number, reason: string) => Promise<void>;
}

const CANCELLATION_REASONS = [
  'Change of travel plans',
  'Found alternative accommodation',
  'Date scheduling conflict',
  'Personal or medical emergency',
  'Remote work project rescheduled',
  'Other reasons',
];

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  reservation,
  propertyTitle = 'Furnished Apartment',
  onConfirmCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  if (!reservation) return null;

  const isPending = reservation.status === 'pending';
  const isConfirmed = reservation.status === 'confirmed';
  const freeCancelDays = reservation.freeCancelDays ?? BOOKING_RULES.freeCancelDays;

  const handleConfirm = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const fullReason =
      selectedReason === 'Other reasons' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    try {
      await onConfirmCancel(reservation.id, fullReason);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to cancel reservation. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Cancel Reservation #${reservation.code}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Warning Callout */}
        <div className="p-4 rounded-xl bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] text-xs text-[var(--color-warning-text)] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Are you sure you want to cancel this booking?</p>
            {isPending && (
              <p>
                Your booking request is currently pending host approval. Cancelling will release the
                card authorization hold immediately. No funds will be charged.
              </p>
            )}
            {isConfirmed && (
              <p>
                Under our {freeCancelDays}-day cancellation policy, cancelling now entitles you to a{' '}
                <strong>100% full refund</strong> returned to your original payment method. The
                apartment dates will be released for other guests.
              </p>
            )}
          </div>
        </div>

        {/* Reservation summary */}
        <div className="p-3 bg-neutral-50 rounded-xl border border-[var(--color-border-light)] text-xs text-neutral-600">
          <div className="font-medium text-[var(--color-text-on-light)] mb-0.5 truncate">
            {propertyTitle}
          </div>
          <div>
            Move-in: <strong>{reservation.moveInDate}</strong> ({reservation.nights} nights)
          </div>
        </div>

        {/* Reason Selector */}
        <div>
          <label
            htmlFor="cancel-booking-reason"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Please select a cancellation reason:
          </label>
          <select
            id="cancel-booking-reason"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-xs rounded-xl border border-[var(--color-border-light)] p-2.5 bg-white text-[var(--color-text-on-light)] focus:outline-none focus:border-[var(--color-brand)]"
          >
            {CANCELLATION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {selectedReason === 'Other reasons' && (
          <div>
            <label
              htmlFor="cancel-booking-notes"
              className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
            >
              Additional notes (optional):
            </label>
            <textarea
              id="cancel-booking-notes"
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Tell us more about why you're cancelling..."
              className="w-full text-xs rounded-xl border border-[var(--color-border-light)] p-2.5 bg-white text-[var(--color-text-on-light)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-xs text-[var(--color-error-text)]"
          >
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[var(--color-border-light)] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Keep Reservation
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="text-xs bg-[var(--color-error)] hover:opacity-90 border-[var(--color-error)] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
