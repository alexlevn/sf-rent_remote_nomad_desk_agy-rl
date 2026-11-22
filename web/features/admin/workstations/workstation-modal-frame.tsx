'use client';

import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkstationModalFrameProps {
  ariaLabel: string;
  title: React.ReactNode;
  isBusy: boolean;
  error: string | null;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

export function WorkstationModalFrame({
  ariaLabel,
  title,
  isBusy,
  error,
  onClose,
  className,
  children,
}: WorkstationModalFrameProps) {
  // Escape closes the dialog, except while a save request is in flight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6',
          className,
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
          <h2 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

interface ModalFooterProps {
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  submitTestId?: string;
}

export function WorkstationModalFooter({
  isSubmitting,
  submitLabel,
  onCancel,
  submitTestId,
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-light)]">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl border border-[var(--color-border-light)] text-neutral-700 text-xs font-medium hover:bg-neutral-50 cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        data-testid={submitTestId}
        className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer shadow-xs"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

interface VisibilityCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function VisibilityCheckbox({ checked, onChange }: VisibilityCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
      />
      <span className="font-semibold text-neutral-700">Visible on public pages</span>
    </label>
  );
}
