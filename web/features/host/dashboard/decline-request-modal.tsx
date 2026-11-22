'use client';

import React, { useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

const DECLINE_REASONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Dates unavailable due to scheduled repairs', label: 'Dates unavailable due to scheduled maintenance' },
  { value: 'Apartment reserved through long-term channel', label: 'Apartment reserved through long-term channel' },
  { value: 'Guest requested configuration unavailable', label: 'Workstation configuration not available' },
  { value: 'Pricing adjustment required', label: 'Pricing adjustment required' },
];

interface DeclineRequestModalProps {
  isLoading: boolean;
  onCancel: () => void;
  // Resolves to an error message to show, or null when the decline went through
  onConfirm: (reason: string) => Promise<string | null>;
}

export function DeclineRequestModal({ isLoading, onCancel, onConfirm }: DeclineRequestModalProps) {
  const [reason, setReason] = useState(DECLINE_REASONS[0].value);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    const failure = await onConfirm(reason);
    if (failure) setError(failure);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-reject-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
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
          Declining this request will immediately release the guest&apos;s card authorization and unblock the dates. Please
          specify the reason:
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-sm border border-[var(--color-border-light)] rounded-lg p-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          >
            {DECLINE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Declining...' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}
