'use client';

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_LEAVE_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave?';

export interface UseUnsavedChangesResult {
  confirmLeave: (message?: string) => boolean;
}

/**
 * Guards against accidental tab close/reload while a form has unsaved edits,
 * and exposes `confirmLeave()` for in-page navigation buttons.
 */
export function useUnsavedChanges(
  isDirty: boolean,
  defaultMessage: string = DEFAULT_LEAVE_MESSAGE,
): UseUnsavedChangesResult {
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by Chromium/Safari to trigger the native leave confirmation dialog
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const confirmLeave = useCallback(
    (message?: string): boolean => {
      if (!isDirtyRef.current) return true;
      if (typeof window === 'undefined') return true;
      return window.confirm(message ?? defaultMessage);
    },
    [defaultMessage],
  );

  return { confirmLeave };
}
