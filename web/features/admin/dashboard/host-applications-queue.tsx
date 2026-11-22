'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import type { HostProfile } from '@/lib/types';
import { formatUtcDate } from '@/lib/format';

interface HostApplicationsQueueProps {
  pendingHosts: HostProfile[];
  pendingCount: number;
  loading: boolean;
  isSubmitting: boolean;
  onApprove: (host: HostProfile) => void;
  onReject: (host: HostProfile) => void;
}

export function HostApplicationsQueue({
  pendingHosts,
  pendingCount,
  loading: loadingQueues,
  isSubmitting,
  onApprove,
  onReject,
}: HostApplicationsQueueProps) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden">
      <div className="p-5 border-b border-[var(--color-border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base md:text-lg font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
            <span>Queue: Host Membership Applications Awaiting Approval</span>
            {(pendingCount) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[var(--color-brand)]">
                {pendingCount} pending
              </span>
            )}
          </h2>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
            Review host property portfolios and approve access to the Host Partner portal.
          </p>
        </div>
        <Link
          href="/admin/hosts"
          className="text-xs font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>View all hosts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loadingQueues ? (
          <div className="p-8 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <div className="w-4 h-4 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
            <span>Loading pending host applications...</span>
          </div>
        ) : pendingHosts.length > 0 ? (
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-[var(--color-text-on-light-muted)] font-medium">
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Cities</th>
                <th className="py-3 px-4">Portfolio</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {pendingHosts.map((host) => {
                const email = host.userEmail || '—';

                return (
                  <tr key={host.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      {host.displayName}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 font-mono text-xs">
                      <div>{email}</div>
                      {host.phone && <div className="text-neutral-400 text-[11px]">{host.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700">{host.cities}</td>
                    <td className="py-3.5 px-4 text-neutral-700">
                      {host.portfolioSize} units
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                      {formatUtcDate(host.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => onApprove(host)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => onReject(host)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-[var(--color-text-on-light-muted)]">
            <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-neutral-800">No pending host applications</p>
            <p className="text-xs text-neutral-500 mt-1">
              All applicant onboarding submissions have been reviewed and approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
