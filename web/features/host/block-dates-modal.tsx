'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, AlertCircle, Ban } from 'lucide-react';
import type { BlockedDate } from '@/lib/types';

export interface BlockDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
  propertyTitle: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onBlock: (data: {
    propertyId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => Promise<{ success: boolean; data?: BlockedDate; error?: string }>;
  unblockTarget?: BlockedDate | null;
  onUnblock?: (blockedDateId: number) => Promise<{ success: boolean; error?: string }>;
}

const REASON_PRESETS = [
  'Owner Personal Stay',
  'Scheduled Maintenance',
  'Property Renovations',
  'Private Offline Booking',
  'Deep Cleaning',
  'Other',
];

export const BlockDatesModal: React.FC<BlockDatesModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  initialStartDate = '',
  initialEndDate = '',
  onBlock,
  unblockTarget,
  onUnblock,
}) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [reasonPreset, setReasonPreset] = useState('Owner Personal Stay');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isUnblockMode = Boolean(unblockTarget);

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError(null);

    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be strictly after start date.');
      return;
    }

    const finalReason =
      reasonPreset === 'Other'
        ? customReason.trim() || 'Owner Block'
        : reasonPreset;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await onBlock({
        propertyId,
        startDate,
        endDate,
        reason: finalReason,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to block dates. Please try again.');
      }
    } catch {
      setError('A network error occurred while blocking dates.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleUnblockConfirm = async () => {
    if (!unblockTarget || !onUnblock || isSubmittingRef.current) return;
    setError(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await onUnblock(unblockTarget.id);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to unblock dates.');
      }
    } catch {
      setError('A network error occurred while unblocking dates.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-dates-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmittingRef.current) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border-light)] relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isUnblockMode ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-800'}`}>
              {isUnblockMode ? <Ban className="w-5 h-5" /> : <Calendar className="w-5 h-5 text-[var(--color-brand)]" />}
            </div>
            <div>
              <h3 id="block-dates-title" className="text-base font-bold text-neutral-900">
                {isUnblockMode ? 'Unblock Calendar Dates' : 'Block Custom Dates'}
              </h3>
              <p className="text-xs text-neutral-500 line-clamp-1 max-w-xs">{propertyTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Unblock Mode Body */}
        {isUnblockMode && unblockTarget ? (
          <div className="py-4 space-y-4">
            <p className="text-sm text-neutral-600">
              This apartment currently has blocked availability for the following dates:
            </p>
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Period:</span>
                <span className="font-bold text-neutral-900">
                  {unblockTarget.startDate} → {unblockTarget.endDate}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Reason:</span>
                <span className="font-semibold text-neutral-700">{unblockTarget.reason || 'Owner Block'}</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Unblocking will make these dates immediately available for guests to book online.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-light)]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Keep Blocked
              </button>
              <button
                type="button"
                onClick={handleUnblockConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Unblocking...' : 'Unblock dates'}
              </button>
            </div>
          </div>
        ) : (
          /* Block Mode Form */
          <form onSubmit={handleBlockSubmit} className="py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="block-start-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Start Date (Move-in)
                </label>
                <input
                  id="block-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
                />
              </div>

              <div>
                <label htmlFor="block-end-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                  End Date (Move-out)
                </label>
                <input
                  id="block-end-date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="block-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                Reason for Blocking
              </label>
              <select
                id="block-reason"
                value={reasonPreset}
                onChange={(e) => setReasonPreset(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
              >
                {REASON_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>

            {reasonPreset === 'Other' && (
              <div>
                <label htmlFor="block-custom-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Custom Reason
                </label>
                <input
                  id="block-custom-reason"
                  type="text"
                  placeholder="e.g. Painting living room"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[var(--color-border-light)] rounded-xl focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
                />
              </div>
            )}

            <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-500">
              Blocked dates are immediately hidden and unavailable on the apartment details page and city search results.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-light)]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? 'Blocking...' : 'Block dates'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
