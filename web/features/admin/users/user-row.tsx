'use client';

import React from 'react';
import { BookmarkCheck, CheckCircle2, Lock, ShieldCheck, Unlock, UserCheck, XCircle } from 'lucide-react';
import type { User, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UserRowProps {
  user: User;
  isCurrentAdmin: boolean;
  isLastAdmin: boolean;
  isSubmitting: boolean;
  onRoleChange: (user: User, role: UserRole) => void;
  onToggleStatus: (user: User) => void;
  onOpenBookings: (user: User) => void;
}

export function UserRow({
  user,
  isCurrentAdmin,
  isLastAdmin,
  isSubmitting,
  onRoleChange,
  onToggleStatus,
  onOpenBookings,
}: UserRowProps) {
  return (
    <tr
      key={user.id}
      className="hover:bg-neutral-50/60 transition-colors group"
    >
      {/* Email & Name */}
      <td className="py-3.5 px-5">
        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
          <span>{user.email}</span>
          {isCurrentAdmin && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-mono font-medium">
              You
            </span>
          )}
        </div>
        {(user.firstName || user.lastName) && (
          <div className="text-[11px] text-neutral-500">
            {user.firstName} {user.lastName}
          </div>
        )}
      </td>

      {/* Role Badge */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        {user.role === 'admin' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>ADMIN</span>
          </span>
        ) : user.role === 'host' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-[var(--color-brand)]">
            <UserCheck className="w-3 h-3" />
            <span>HOST</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700">
            <span>GUEST</span>
          </span>
        )}
      </td>

      {/* Status Badge */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        {user.isActive !== false ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Active</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>Suspended</span>
          </span>
        )}
      </td>

      {/* Created Date */}
      <td className="py-3.5 px-4 text-neutral-500 font-mono text-xs whitespace-nowrap">
        {user.createdAt ? user.createdAt.split('T')[0] : '—'}
      </td>

      {/* Role Modification */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        {user.role === 'guest' ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onRoleChange(user, 'admin')}
            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50 transition-colors shadow-2xs inline-flex items-center gap-1"
          >
            <span>Promote to Admin</span>
          </button>
        ) : user.role === 'admin' ? (
          isLastAdmin ? (
            <span className="text-xs text-neutral-400 font-medium" title="Cannot demote last admin">
              Fixed
            </span>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onRoleChange(user, 'guest')}
              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
            >
              <span>Demote to Guest</span>
            </button>
          )
        ) : (
          <span
            className="text-xs text-neutral-400 font-medium"
            title="Role host is managed via Host Approvals"
          >
            Fixed
          </span>
        )}
      </td>

      {/* Actions: Bookings Drawer & Access Control */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid={`user-bookings-btn-${user.id}`}
            onClick={() => onOpenBookings(user)}
            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors inline-flex items-center gap-1"
            title="View user reservations"
          >
            <BookmarkCheck className="w-3 h-3 text-[var(--color-brand)]" />
            <span>Bookings</span>
          </button>

          {user.isActive !== false ? (
            <button
              type="button"
              onClick={() => onToggleStatus(user)}
              disabled={isSubmitting || isCurrentAdmin || isLastAdmin}
              title={
                isCurrentAdmin
                  ? 'Cannot suspend your own account'
                  : isLastAdmin
                  ? 'Cannot suspend the last admin account'
                  : 'Suspend user account'
              }
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1',
                isCurrentAdmin || isLastAdmin
                  ? 'opacity-40 cursor-not-allowed text-neutral-400'
                  : 'text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent',
              )}
            >
              <Lock className="w-3 h-3" />
              <span>Suspend</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onToggleStatus(user)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
            >
              <Unlock className="w-3 h-3" />
              <span>Reactivate</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
