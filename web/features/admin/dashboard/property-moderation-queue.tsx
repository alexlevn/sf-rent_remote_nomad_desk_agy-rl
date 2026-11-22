import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building } from 'lucide-react';
import type { Property } from '@/lib/types';

interface PropertyModerationQueueProps {
  pendingProperties: Property[];
  pendingCount: number;
  loading: boolean;
}

export function PropertyModerationQueue({ pendingProperties, pendingCount, loading: loadingQueues }: PropertyModerationQueueProps) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-[var(--color-border-light)] flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
            <span>Property Moderation Queue</span>
            {(pendingCount) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {pendingCount} pending
              </span>
            )}
          </h3>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
            Newly submitted apartment listings awaiting administrative review.
          </p>
        </div>
        <Link
          href="/admin/properties"
          className="text-xs font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
        >
          <span>Moderate</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-5 flex-1">
        {loadingQueues ? (
          <div className="h-full flex items-center justify-center gap-2 p-6 text-xs text-neutral-500">
            <div className="w-4 h-4 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
            <span>Loading moderation queue...</span>
          </div>
        ) : pendingProperties.length > 0 ? (
          <div className="divide-y divide-[var(--color-border-light)]">
            {pendingProperties.map((prop) => (
              <div key={prop.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{prop.title}</div>
                  <div className="text-xs text-neutral-500">
                    {prop.city} · ${Math.round(prop.pricePerMonth / 100).toLocaleString('en-US')}/mo
                  </div>
                </div>
                <Link
                  href="/admin/properties"
                  className="px-3 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold hover:bg-neutral-50"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--color-text-on-light-muted)]">
            <Building className="w-8 h-8 text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700">No properties awaiting moderation</p>
            <p className="text-neutral-400 mt-0.5">
              All partner listings are currently published or in draft mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
