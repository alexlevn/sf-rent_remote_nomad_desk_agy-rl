'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { HostProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { HostStatusBadge, getHostEmail, type HostReviewActions } from './host-detail-drawer';

const ROW_BTN = 'inline-flex items-center justify-center rounded-lg text-xs font-semibold px-2.5 py-1.5 transition-colors cursor-pointer';

interface HostRowProps {
  host: HostProfile;
  actions: HostReviewActions;
  onOpenDetails: (host: HostProfile) => void;
}

export function HostRow({ host, actions, onOpenDetails }: HostRowProps) {
  const { isSubmitting } = actions;

  return (
    <tr className="hover:bg-neutral-50/70 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700 shrink-0">
            {host.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <button
              type="button"
              onClick={() => onOpenDetails(host)}
              className="font-semibold text-[var(--color-text-on-light)] hover:text-[var(--color-brand)] text-left"
            >
              {host.displayName}
            </button>
            <div className="text-xs text-[var(--color-text-on-light-muted)]">
              ID: #{host.id} · {host.slug}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-[var(--color-text-on-light-muted)]">{getHostEmail(host)}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-1 text-[var(--color-text-on-light)]">
          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          {host.cities}
        </span>
      </td>
      <td className="px-6 py-4 font-semibold text-[var(--color-text-on-light)]">{host.portfolioSize} units</td>
      <td className="px-6 py-4">
        <HostStatusBadge status={host.status} />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenDetails(host)}
            className={cn(ROW_BTN, 'border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50')}
            title="View full application"
          >
            Details
          </button>

          {host.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => actions.onApprove(host)}
                disabled={isSubmitting}
                className={cn(ROW_BTN, 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50')}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => actions.onStartReject(host)}
                disabled={isSubmitting}
                className={cn(ROW_BTN, 'border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50')}
              >
                Reject
              </button>
            </>
          )}

          {host.status === 'approved' && (
            <button
              type="button"
              onClick={() => actions.onSuspend(host)}
              disabled={isSubmitting}
              className={cn(ROW_BTN, 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50')}
            >
              Suspend
            </button>
          )}

          {host.status === 'suspended' && (
            <button
              type="button"
              onClick={() => actions.onReactivate(host)}
              disabled={isSubmitting}
              className={cn(ROW_BTN, 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white disabled:opacity-50')}
            >
              Reactivate
            </button>
          )}

          {host.status === 'rejected' && (
            <button
              type="button"
              onClick={() => actions.onApprove(host)}
              disabled={isSubmitting}
              className={cn(ROW_BTN, 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-50')}
            >
              Re-Approve
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
