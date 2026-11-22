'use client';

import React from 'react';
import { CalendarCheck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ListingSaveIntent } from './form-values';

const PRIMARY_BTN_CLASS =
  'flex-1 sm:flex-none min-h-10 px-5 py-2 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-sm font-bold text-white shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer';

function Spinner({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin',
          light ? 'border-white' : 'border-neutral-500',
        )}
      />
      {label}
    </span>
  );
}

interface ListingActionBarProps {
  isDirty: boolean;
  errorCount: number;
  isReadOnly: boolean;
  isSubmitting: boolean;
  submittingIntent: ListingSaveIntent | null;
  isPreservableLiveStatus: boolean;
  onCancel: () => void;
  onSubmit: (intent: ListingSaveIntent) => void;
}

export function ListingActionBar({
  isDirty,
  errorCount,
  isReadOnly,
  isSubmitting,
  submittingIntent,
  isPreservableLiveStatus,
  onCancel,
  onSubmit,
}: ListingActionBarProps) {
  const isBusy = (intent: ListingSaveIntent) => isSubmitting && submittingIntent === intent;
  const disabled = isReadOnly || isSubmitting;

  return (
    <div
      data-testid="host-sticky-save-bar"
      className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--color-border-light)] bg-white/95 backdrop-blur-xs px-4 py-3 shadow-lg"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', isDirty ? 'bg-amber-500' : 'bg-emerald-500')} />
        <span
          data-testid="host-dirty-status"
          className={isDirty ? 'text-amber-700 font-semibold' : 'text-neutral-500'}
        >
          {isDirty ? 'Unsaved changes' : 'Ready to save'}
        </span>
        {errorCount > 0 && (
          <span role="alert" className="text-rose-600 font-semibold">
            · Please fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} above
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          data-testid="host-cancel-btn"
          className="min-h-10 px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors text-center disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit('draft')}
          className="flex-1 sm:flex-none min-h-10 px-4 py-2 rounded-lg border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isBusy('draft') ? (
            <Spinner label="Saving Draft..." />
          ) : isPreservableLiveStatus ? (
            'Move to Draft'
          ) : (
            'Save Draft'
          )}
        </button>

        {isPreservableLiveStatus ? (
          <button type="button" disabled={disabled} onClick={() => onSubmit('keep')} className={PRIMARY_BTN_CLASS}>
            {isBusy('keep') ? (
              <Spinner label="Saving Changes..." light />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSubmit('pending_review')}
            className={PRIMARY_BTN_CLASS}
          >
            {isBusy('pending_review') ? (
              <Spinner label="Submitting..." light />
            ) : (
              <>
                <CalendarCheck className="w-4 h-4" />
                <span>Submit for Review →</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
