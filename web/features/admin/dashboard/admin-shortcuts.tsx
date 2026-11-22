import React from 'react';
import Link from 'next/link';
import { BookmarkCheck, Settings, UserCheck, Users } from 'lucide-react';
import { SITE_CONFIG } from '@/content/site';

export function AdminShortcuts() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-1">
          Admin Platform Shortcuts
        </h3>
        <p className="text-xs text-[var(--color-text-on-light-muted)] mb-4">
          Fast navigation to core marketplace administration sectors.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/admin/users"
            className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-blue-50 text-blue-600 mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-neutral-900">User Directory</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Manage roles & access</div>
          </Link>

          <Link
            href="/admin/settings"
            className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-600 mb-2 group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-neutral-900">FX & Settings</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Rates & commissions</div>
          </Link>

          <Link
            href="/admin/reservations"
            className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-purple-50 text-purple-600 mb-2 group-hover:scale-105 transition-transform">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-neutral-900">Booking Monitor</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Stays & cancellations</div>
          </Link>

          <Link
            href="/admin/hosts"
            className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
          >
            <div className="p-2 w-fit rounded-lg bg-orange-50 text-[var(--color-brand)] mb-2 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-neutral-900">Host Partners</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Active & suspended hosts</div>
          </Link>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--color-border-light)] mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{SITE_CONFIG.name} Operations Console</span>
        <span className="font-mono text-[11px]">Admin v1.0</span>
      </div>
    </div>
  );
}
