'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Property } from '@/lib/types';

export const DEFAULT_REJECTION_REASON = 'Listing requires higher quality workstation photos';

interface PropertyRejectModalProps {
  property: Property;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function PropertyRejectModal({ property, isSubmitting, onCancel, onConfirm }: PropertyRejectModalProps) {
  const [reason, setReason] = useState(DEFAULT_REJECTION_REASON);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reject ${property.title}`}
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-[var(--color-text-on-light)]">Reject Property Listing</h4>
            <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-1">{property.title}</p>
          </div>
        </div>

        <p className="text-sm text-neutral-600">
          Please state why this listing is being rejected so the Host can correct the listing details.
        </p>

        <textarea
          aria-label="Rejection reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full p-3 rounded-lg border border-[var(--color-border-light)] bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          placeholder="Enter rejection reason..."
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting || !reason.trim()}
            className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}
