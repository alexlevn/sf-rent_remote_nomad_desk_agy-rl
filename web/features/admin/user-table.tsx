'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type { Property, Reservation, ReservationStatus, User, UserRole } from '@/lib/types';
import type { AdminUsersCounts } from '@/lib/api/users';
import {
  fetchAdminPropertiesAction,
  fetchAdminUserReservationsAction,
  fetchAdminUsersPaginatedAction,
  updateUserAction,
} from '@/app/admin/admin-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserCheck,
  Lock,
  Unlock,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Calendar,
  BookmarkCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const renderReservationStatusBadge = (status: ReservationStatus) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border';
    switch (status) {
      case 'confirmed':
        return <span className={cn(base, 'bg-emerald-50 text-emerald-700 border-emerald-200')}>Confirmed</span>;
      case 'pending':
        return <span className={cn(base, 'bg-amber-50 text-amber-800 border-amber-200')}>Pending</span>;
      case 'completed':
        return <span className={cn(base, 'bg-blue-100 text-blue-800 border-blue-200')}>Completed</span>;
      case 'cancelled':
        return <span className={cn(base, 'bg-red-50 text-red-700 border-red-200')}>Cancelled</span>;
      case 'rejected':
        return <span className={cn(base, 'bg-red-50 text-red-700 border-red-200')}>Rejected</span>;
      case 'expired':
        return <span className={cn(base, 'bg-neutral-100 text-neutral-600 border-neutral-300')}>Expired</span>;
      default:
        return <span className={cn(base, 'bg-neutral-100 text-neutral-700 border-neutral-200')}>{status}</span>;
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
                            onClick={() => handleRoleChange(user, 'admin')}
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
                              onClick={() => handleRoleChange(user, 'guest')}
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
                            onClick={() => handleOpenBookings(user)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors inline-flex items-center gap-1"
                            title="View user reservations"
                          >
                            <BookmarkCheck className="w-3 h-3 text-[var(--color-brand)]" />
                            <span>Bookings</span>
                          </button>

                          {user.isActive !== false ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
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
                              onClick={() => handleToggleStatus(user)}
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

      {/* Drawer: User Reservations History */}
      {drawerUser && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDrawer();
            }
          }}
        >
          <div
            data-testid="user-reservations-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Reservations for ${drawerUser.email}`}
            className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto border-l border-[var(--color-border-light)] flex flex-col justify-between"
          >
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--color-border-light)]">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-on-light)]">
                    User Reservations
                  </h3>
                  <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                    {drawerUser.firstName || drawerUser.lastName
                      ? `${drawerUser.firstName ?? ''} ${drawerUser.lastName ?? ''}`.trim() + ' · '
                      : ''}
                    <span className="font-mono">{drawerUser.email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close reservations drawer"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              {drawerLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
                  <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                  <span>Loading user bookings...</span>
                </div>
              ) : drawerError ? (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{drawerError}</span>
                </div>
              ) : drawerReservations.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
                  <BookmarkCheck className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="font-semibold text-neutral-700">No bookings found</p>
                  <p className="text-neutral-400">
                    This user has not made any reservations on NomadDesk yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
                    {drawerReservations.length}{' '}
                    {drawerReservations.length === 1 ? 'Reservation' : 'Reservations'}
                  </div>
                  {drawerReservations.map((res) => {
                    const prop = propertyById.get(res.propertyId);
                    const totalUSD = Math.round((res.totalAmount || 0) / 100);
                    return (
                      <div
                        key={res.id}
                        data-testid={`user-drawer-reservation-${res.code}`}
                        className="p-4 rounded-xl border border-[var(--color-border-light)] bg-neutral-50/70 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--color-brand)]">
                            #{res.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {renderReservationStatusBadge(res.status)}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-neutral-900">
                            {prop ? prop.title : `Property #${res.propertyId}`}
                          </div>
                          {prop?.city && (
                            <div className="text-xs text-neutral-500">{prop.city}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 text-xs border-t border-[var(--color-border-light)]">
                          <div className="flex items-center gap-1.5 text-neutral-600">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>
                              {res.moveInDate} → {res.moveOutDate} ({res.nights}n)
                            </span>
                          </div>
                          <div className="font-bold text-neutral-900">
                            ${totalUSD.toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[var(--color-border-light)] flex items-center justify-end">
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
