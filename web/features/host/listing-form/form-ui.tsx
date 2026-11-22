import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const labelClass = 'block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5';
export const plainInputClass =
  'w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]';
export const compactNumberClass =
  'w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center';
export const selectClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 bg-white focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]';

export function validatedInputClass(hasError: boolean, extra = 'text-sm text-neutral-900 placeholder:text-neutral-400') {
  return cn(
    'w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-colors',
    extra,
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
      : 'border-neutral-300 focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]',
  );
}

export function SectionHeading({ id, icon: Icon, children }: { id: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-[var(--color-brand)]" />
      <h3 id={id} className="text-base sm:text-lg font-bold text-neutral-900">
        {children}
      </h3>
    </div>
  );
}

export function SectionHeader(props: { id: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="pb-3 mb-5 border-b border-neutral-200">
      <SectionHeading {...props} />
    </div>
  );
}

export function FieldError({ message, asAlert = false }: { message?: string; asAlert?: boolean }) {
  if (!message) return null;
  return (
    <p role={asAlert ? 'alert' : undefined} className="text-xs text-rose-600 mt-1">
      {message}
    </p>
  );
}

export function RequiredMark() {
  return <span className="text-rose-500">*</span>;
}
