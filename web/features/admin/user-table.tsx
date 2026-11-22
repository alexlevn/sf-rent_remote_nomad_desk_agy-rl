'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type { Property, Reservation, User, UserRole } from '@/lib/types';
import type { AdminUsersCounts } from '@/lib/api/users';
import {
  fetchAdminPropertiesAction,
  fetchAdminUserReservationsAction,
  fetchAdminUsersPaginatedAction,
  updateUserAction,
} from '@/app/admin/admin-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { Search, AlertCircle, AlertTriangle, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRow } from '@/features/admin/users/user-row';
import { UserReservationsDrawer } from '@/features/admin/users/user-reservations-drawer';

interface UserTableProps {
  currentAdminId?: number | null;
  currentAdminEmail?: string;
}

const PAGE_SIZE = 20;

const EMPTY_COUNTS: AdminUsersCounts = {
  all: 0,
  guest: 0,
  host: 0,
  admin: 0,
  activeAdmins: 0,
  active: 0,
  inactive: 0,
};

export function UserTable({ currentAdminId = null, currentAdminEmail = '' }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [counts, setCounts] = useState<AdminUsersCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Reservations Drawer state
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [drawerReservations, setDrawerReservations] = useState<Reservation[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const propertiesLoadedRef = useRef(false);

  const requestIdRef = useRef(0);
  const drawerRequestIdRef = useRef(0);
  const isActionRunningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSameAdmin = (targetUser: User) =>
    (currentAdminId != null && targetUser.id === currentAdminId) ||
    (Boolean(currentAdminEmail) && targetUser.email === currentAdminEmail);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const closeDrawer = useCallback(() => {
    drawerRequestIdRef.current += 1;
    setDrawerUser(null);
  }, []);

  // Debounce search (250ms) and reset page to 1 only when the trimmed query changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerUser) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerUser, closeDrawer]);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await fetchAdminUsersPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          role: roleFilter,
          status: statusFilter,
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setUsers(result.items);
          setTotal(result.total);
          setCounts(result.counts);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load users');
          setLoading(false);
        });
      }
    },
    [roleFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const showToast = (msg: string) => {
    setErrorMessage(null);
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const propertyById = useMemo(() => {
    const map = new Map<number, Property>();
    for (const p of properties) {
      map.set(p.id, p);
    }
    return map;
  }, [properties]);

  // Open User Reservations Drawer and load user's bookings
  const handleOpenBookings = async (user: User) => {
    const reqId = ++drawerRequestIdRef.current;
    setDrawerUser(user);
    setDrawerReservations([]);
    setDrawerError(null);
    setDrawerLoading(true);

    try {
      const [userReservations, propsResult] = await Promise.all([
        fetchAdminUserReservationsAction(user.id),
        propertiesLoadedRef.current ? Promise.resolve(null) : fetchAdminPropertiesAction(),
      ]);
      if (reqId !== drawerRequestIdRef.current) return;
      startTransition(() => {
        if (propsResult) {
          propertiesLoadedRef.current = true;
          setProperties(propsResult.propList);
        }
        setDrawerReservations(userReservations);
        setDrawerLoading(false);
      });
    } catch (err) {
      if (reqId !== drawerRequestIdRef.current) return;
      startTransition(() => {
        setDrawerError(err instanceof Error ? err.message : 'Failed to load user reservations');
        setDrawerLoading(false);
      });
    }
  };

  // Global active admin count from SQL counts (server also enforces active-admin protection)
  const activeAdminCount = counts.activeAdmins;

  const reloadAfterMutation = async () => {
    const nextPage =
      users.length <= 1 && page > 1 && (roleFilter !== 'all' || statusFilter !== 'all')
        ? page - 1
        : page;
    if (nextPage !== page) {
      setPage(nextPage);
    } else {
      await fetchPage(page);
    }
  };

  // Handle Role Change (Promote / Demote)
  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    if (isActionRunningRef.current) return;
    if (
      targetUser.role === 'admin' &&
      targetUser.isActive !== false &&
      newRole !== 'admin' &&
      activeAdminCount <= 1
    ) {
      setErrorMessage('Cannot demote the last remaining active administrator account.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updateUserAction(targetUser.id, { role: newRole });
      showToast(
        newRole === 'admin'
          ? `User ${targetUser.email} promoted to Administrator.`
          : `Administrator ${targetUser.email} demoted to Guest.`
      );
      await reloadAfterMutation();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Handle Account Suspension / Activation Toggle
  const handleToggleStatus = async (targetUser: User) => {
    if (isActionRunningRef.current) return;
    if (isSameAdmin(targetUser) && targetUser.isActive) {
      setErrorMessage('You cannot suspend your own active administrator account.');
      return;
    }
    if (targetUser.role === 'admin' && targetUser.isActive && activeAdminCount <= 1) {
      setErrorMessage('Cannot suspend the last remaining active administrator account.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    const nextActive = !targetUser.isActive;
    try {
      await updateUserAction(targetUser.id, { isActive: nextActive });
      showToast(
        nextActive
          ? `Account for ${targetUser.email} has been activated.`
          : `Account for ${targetUser.email} has been suspended.`
      );
      await reloadAfterMutation();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update account status');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-medium flex items-center justify-between gap-2 shadow-sm animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inline Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs md:text-sm font-medium flex items-center justify-between gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[var(--color-border-light)] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search users by email or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-[var(--color-border-light)] rounded-xl text-xs md:text-sm focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter Tabs */}
          <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-xs font-semibold">
            {(['all', 'guest', 'host', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg capitalize transition-all',
                  roleFilter === r
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800',
                )}
              >
                {r === 'all' ? `All Roles (${counts.all})` : `${r} (${counts[r]})`}
              </button>
            ))}
          </div>

          {/* Status Filter Dropdown */}
          <select
            aria-label="Filter by account status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | 'active' | 'suspended');
              setPage(1);
            }}
            className="px-3 py-2 bg-neutral-50 border border-[var(--color-border-light)] rounded-xl text-xs font-medium text-neutral-700 focus:outline-none focus:border-[var(--color-brand)]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only ({counts.active})</option>
            <option value="suspended">Suspended Only ({counts.inactive})</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/80 text-[var(--color-text-on-light-muted)] font-medium">
                <th className="py-3.5 px-5">Email / Account</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4">Role Modification</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700">No matching user accounts</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Try adjusting your search criteria or role filters.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isCurrentAdmin = isSameAdmin(user);
                  const isLastAdmin =
                    user.role === 'admin' && user.isActive !== false && activeAdminCount <= 1;

                  return (
                    <UserRow
                      key={user.id}
                      user={user}
                      isCurrentAdmin={isCurrentAdmin}
                      isLastAdmin={isLastAdmin}
                      isSubmitting={isSubmitting}
                      onRoleChange={handleRoleChange}
                      onToggleStatus={handleToggleStatus}
                      onOpenBookings={handleOpenBookings}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={loading}
          itemLabel="users"
        />

        <div className="px-4 py-2.5 border-t border-[var(--color-border-light)] bg-neutral-50/40 text-[11px] text-neutral-500">
          * Host roles are managed via the Host Approvals queue.
        </div>
      </div>

      {drawerUser && (
        <UserReservationsDrawer
          user={drawerUser}
          reservations={drawerReservations}
          loading={drawerLoading}
          error={drawerError}
          propertyById={propertyById}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
