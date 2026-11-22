'use client';

import React from 'react';
import { AlertTriangle, Building, Calendar, CheckCircle, ExternalLink, Globe, MapPin, Phone, UserCheck, X } from 'lucide-react';
import type { HostProfile, HostStatus } from '@/lib/types';
import { formatUtcDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const BADGE_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border';
const HOST_STATUS_STYLES: Record<HostStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  suspended: { label: 'Suspended', className: 'bg-neutral-200 text-neutral-800 border-neutral-300' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function HostStatusBadge({ status }: { status: HostStatus }) {
  const style = HOST_STATUS_STYLES[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-700 border-neutral-200' };
  return <span className={cn(BADGE_BASE, style.className)}>{style.label}</span>;
}

export function getHostEmail(host: HostProfile): string {
  return host.userEmail || '—';
}

export interface HostReviewActions {
  isSubmitting: boolean;
  onApprove: (host: HostProfile) => void;
  onStartReject: (host: HostProfile) => void;
  onSuspend: (host: HostProfile) => void;
  onReactivate: (host: HostProfile) => void;
}

const FOOTER_BTN =
  'inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg px-4 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer';
const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]';

interface HostDetailDrawerProps {
  host: HostProfile;
  actions: HostReviewActions;
  onClose: () => void;
}

export function HostDetailDrawer({ host, actions, onClose }: HostDetailDrawerProps) {
  const { isSubmitting } = actions;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Host application details for ${host.displayName}`}
        className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto border-l border-[var(--color-border-light)] flex flex-col justify-between"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)]">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-on-light)]">{host.displayName}</h3>
              <div className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                Application ID #{host.id} · <HostStatusBadge status={host.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close host details"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-neutral-50 space-y-2.5">
              <div className={SECTION_LABEL}>Contact & Portfolio</div>
              <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                <UserCheck className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>
                  Email: <strong>{getHostEmail(host)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Phone: {host.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Target Cities: {host.cities}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                <Building className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>
                  Portfolio Size: <strong>{host.portfolioSize} units</strong>
                </span>
              </div>
              {host.website && (
                <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                  <Globe className="w-4 h-4 text-neutral-400 shrink-0" />
                  <a
                    href={host.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
                  >
                    {host.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 space-y-2">
              <div className={SECTION_LABEL}>Company Bio & Remote Pitch</div>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{host.bio || 'No company bio provided.'}</p>
            </div>

            {host.rejectionReason && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1 text-red-800">
                <div className="flex items-center gap-1.5 font-semibold text-xs uppercase">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  Rejection Reason
                </div>
                <p className="text-xs">{host.rejectionReason}</p>
              </div>
            )}

            <div className="text-xs text-neutral-500 space-y-1 pt-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Applied: {formatUtcDate(host.createdAt)}</span>
              </div>
              {host.approvedAt && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approved: {formatUtcDate(host.approvedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--color-border-light)] flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(FOOTER_BTN, 'border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50')}
          >
            Close
          </button>

          {host.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => actions.onStartReject(host)}
                disabled={isSubmitting}
                className={cn(FOOTER_BTN, 'border border-red-200 bg-white text-red-600 hover:bg-red-50')}
              >
                Reject Application
              </button>
              <button
                type="button"
                onClick={() => actions.onApprove(host)}
                disabled={isSubmitting}
                className={cn(FOOTER_BTN, 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              >
                Approve Host
              </button>
            </>
          )}

          {host.status === 'approved' && (
            <button
              type="button"
              onClick={() => actions.onSuspend(host)}
              disabled={isSubmitting}
              className={cn(FOOTER_BTN, 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50')}
            >
              Suspend Host
            </button>
          )}

          {host.status === 'suspended' && (
            <button
              type="button"
              onClick={() => actions.onReactivate(host)}
              disabled={isSubmitting}
              className={cn(FOOTER_BTN, 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white')}
            >
              Reactivate Host
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
