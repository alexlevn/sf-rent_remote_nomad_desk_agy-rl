import React from 'react';
import type { ReservationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ReservationStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  expired: { label: 'Expired', className: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
};

const SIZE_CLASS = {
  md: 'px-2.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-[11px]',
} as const;

interface ReservationStatusPillProps {
  status: ReservationStatus;
  size?: keyof typeof SIZE_CLASS;
}

export function ReservationStatusPill({ status, size = 'md' }: ReservationStatusPillProps) {
  const style = STATUS_STYLES[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-700 border-neutral-200' };
  return (
    <span className={cn('inline-flex items-center rounded-full font-semibold border', SIZE_CLASS[size], style.className)}>
      {style.label}
    </span>
  );
}

const PAYMENT_STYLES: Record<string, { label: string; className: string }> = {
  captured: { label: 'Captured', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  authorized: { label: 'Hold', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  refunded: { label: 'Refunded', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  voided: { label: 'Voided', className: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
};

export function PaymentStatusPill({ paymentStatus }: { paymentStatus?: string }) {
  const style = paymentStatus ? PAYMENT_STYLES[paymentStatus] : undefined;
  if (!style) return <span className="text-xs text-neutral-400">{paymentStatus || 'Pending'}</span>;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', style.className)}>{style.label}</span>
  );
}
