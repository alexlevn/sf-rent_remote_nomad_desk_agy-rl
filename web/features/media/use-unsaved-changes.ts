'use client';

import { useCallback, useEffect } from 'react';

const DEFAULT_LEAVE_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave?';

export interface UseUnsavedChangesResult {
  confirmLeave: (message?: string) => boolean;
}

/**
 * Guards against accidental tab close/reload and in-app link navigation while a form
 * has unsaved edits, and exposes `confirmLeave()` for explicit cancel/back buttons.
 */
export function useUnsavedChanges(
  isDirty: boolean,
  defaultMessage: string = DEFAULT_LEAVE_MESSAGE,
): UseUnsavedChangesResult {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by Chromium/Safari to trigger the native leave confirmation dialog
      event.returnValue = '';
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (
        nextUrl.origin === window.location.origin &&
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      if (!window.confirm(defaultMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isDirty, defaultMessage]);

  const confirmLeave = useCallback(
    (message?: string): boolean => {
      if (!isDirty) return true;
      if (typeof window === 'undefined') return true;
      return window.confirm(message ?? defaultMessage);
    },
    [isDirty, defaultMessage],
  );

  return { confirmLeave };
}
