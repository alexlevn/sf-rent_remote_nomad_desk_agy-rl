import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Reservation } from '@/lib/types';
import { cn } from '@/lib/utils';

const PILL = 'inline-flex items-center gap-1 rounded-full font-bold border';

interface ReservationStatusBadgeProps {
  reservation: Reservation;
  hoursLeft: number;
  compact?: boolean;
}

export function ReservationStatusBadge({ reservation, hoursLeft, compact = false }: ReservationStatusBadgeProps) {
  const sizeCls = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  switch (reservation.status) {
    case 'pending':
      return (
        <div className={compact ? '' : 'space-y-1'}>
          <span className={cn(PILL, 'bg-amber-100 text-amber-800 border-amber-200', sizeCls)}>
            <Clock className="w-3 h-3" />
            <span>
              {compact ? (hoursLeft > 0 ? `Action Required (${hoursLeft}h)` : 'Expired Window') : 'Action Required'}
            </span>
          </span>
          {!compact && (
            <div className="text-[10px] text-amber-700 font-semibold">
              {hoursLeft > 0 ? `Respond in ${hoursLeft}h` : 'Response window passed'}
            </div>
          )}
        </div>
      );
    case 'confirmed':
      return (
        <span className={cn(PILL, 'bg-emerald-100 text-emerald-800 border-emerald-200', sizeCls)}>
          <CheckCircle2 className="w-3 h-3" />
          Confirmed
        </span>
      );
    case 'completed':
      return <span className={cn(PILL, 'bg-neutral-100 text-neutral-700 border-neutral-200', sizeCls)}>Completed</span>;
    case 'rejected':
      return (
        <span className={cn(PILL, 'bg-red-100 text-red-800 border-red-200', sizeCls)}>
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    case 'expired':
      return (
        <span className={cn(PILL, 'bg-orange-100 text-orange-800 border-orange-200', sizeCls)}>
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    default:
      return <span className={cn(PILL, 'bg-neutral-100 text-neutral-600 border-neutral-200', sizeCls)}>Cancelled</span>;
  }
}
