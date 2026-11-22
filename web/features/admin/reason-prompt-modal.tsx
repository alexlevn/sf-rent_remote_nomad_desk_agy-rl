'use client';

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ReasonPromptModalProps {
  ariaLabel: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  defaultReason: string;
  confirmLabel?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

// Confirmation dialog that asks the admin for a required free-text reason
export function ReasonPromptModal({
  ariaLabel,
  icon: Icon,
  title,
  subtitle,
  description,
  defaultReason,
  confirmLabel = 'Confirm Rejection',
  isSubmitting,
  onCancel,
  onConfirm,
}: ReasonPromptModalProps) {
  const [reason, setReason] = useState(defaultReason);

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
        aria-label={ariaLabel}
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-[var(--color-text-on-light)]">{title}</h4>
            <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-1">{subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-neutral-600">{description}</p>

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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
