'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export function DarkToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[var(--color-bg-dark)] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-[var(--color-border-dark)] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button type="button" onClick={onDismiss} className="text-neutral-400 hover:text-white ml-2" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
  testId?: string;
  bannerRef?: React.Ref<HTMLDivElement>;
}

export function ErrorBanner({ message, onDismiss, testId, bannerRef }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      ref={bannerRef}
      role="alert"
      data-testid={testId}
      className="flex items-start justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
