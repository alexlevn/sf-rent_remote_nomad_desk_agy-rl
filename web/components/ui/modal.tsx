'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Close on Escape key press and lock background scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light)] border border-[var(--color-border-light)] p-6 shadow-2xl transition-all duration-200 z-10',
          maxWidth,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            {title && (
              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-[var(--color-text-on-light)]"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-full p-1.5 text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] hover:bg-black/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
