'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type { Reservation, ReservationStatus, Property, HostProfile } from '@/lib/types';
import type {
  AdminReservationsStatusCounts,
  AdminReservationsSummary,
} from '@/lib/api/reservations';
import {
  fetchAdminPropertiesAction,
  fetchAdminReservationsPaginatedAction,
  cancelReservationAdminAction,
} from '@/app/admin/admin-actions';
import { BOOKING_RULES } from '@/content/booking-rules';
import { formatUtcDate } from '@/lib/format';
import { PaginationBar } from '@/features/admin/pagination-bar';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  BookmarkCheck,
  Calendar,
  ShieldAlert,
  X,
} from 'lucide-react';

const PAGE_SIZE = 20;

const EMPTY_COUNTS: AdminReservationsStatusCounts = {
  all: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  rejected: 0,
  expired: 0,
};

const EMPTY_SUMMARY: AdminReservationsSummary = {
  totalCount: 0,
  pendingCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  rejectedCount: 0,
  expiredCount: 0,
  gmvCents: 0,
  commissionCents: 0,
  hostPayoutCents: 0,
};

export function AllReservationsTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [hosts, setHosts] = useState<HostProfile[]>([]);
  const [counts, setCounts] = useState<AdminReservationsStatusCounts>(EMPTY_COUNTS);
  const [summary, setSummary] = useState<AdminReservationsSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intervention modal & detail modal
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [voidingReservation, setVoidingReservation] = useState<Reservation | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Cancelled by Platform Administrator due to compliance review');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isActionRunningRef = useRef(false);
  const requestIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load property & host metadata once on mount for display names and host filter dropdown
  useEffect(() => {
    let active = true;
    const loadMetadata = async () => {
      try {
        const { propList, hostList } = await fetchAdminPropertiesAction();
        if (!active) return;
        startTransition(() => {
          setProperties(propList);
          setHosts(hostList);
        });
      } catch {
        // Non-blocking: table falls back to Property #id / Host #id
      }
    };
    loadMetadata();
    return () => {
      active = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Debounce keyword search (250ms) and reset page to 1 only when the trimmed query changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    if (!selectedReservation && !voidingReservation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActionRunningRef.current) {
        if (voidingReservation) {
          setVoidingReservation(null);
        } else {
          setSelectedReservation(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReservation, voidingReservation]);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await fetchAdminReservationsPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          status: statusFilter as ReservationStatus | 'all',
          hostId: hostFilter === 'all' ? undefined : Number(hostFilter),
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setReservations(result.items);
          setTotal(result.total);
          setCounts(result.counts);
          setSummary(result.summary);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load reservations');
          setLoading(false);
        });
      }
    },
    [statusFilter, hostFilter, debouncedSearch]
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
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  // Property & Host lookup helpers
  const propertyById = useMemo(() => {
    const map = new Map<number, Property>();
    for (const p of properties) {
      map.set(p.id, p);
    }
    return map;
  }, [properties]);

  const hostById = useMemo(() => {
    const map = new Map<number, HostProfile>();
    for (const h of hosts) {
      map.set(h.id, h);
    }
    return map;
  }, [hosts]);

  const getProperty = useCallback(
    (propertyId: number) => propertyById.get(propertyId),
    [propertyById]
  );

  const getHostName = useCallback(
    (propertyId: number) => {
      const prop = propertyById.get(propertyId);
      if (!prop) return 'Unknown Host';
      const host = hostById.get(prop.hostId);
      return host ? host.displayName : `Host #${prop.hostId}`;
    },
    [propertyById, hostById]
  );

  // Admin Intervention Cancel / Void action (AC-ADMIN-4)
  const handleConfirmAdminCancel = async () => {
    if (!voidingReservation || isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // AC-ADMIN-4: Admin cancels confirmed booking -> cancelledBy = 'admin', paymentStatus = 'refunded'
      await cancelReservationAdminAction(
        voidingReservation.id,
        cancellationReason
      );
      showToast(`Reservation #${voidingReservation.code} cancelled by Admin. Refund processed.`);
      const resId = voidingReservation.id;
      setVoidingReservation(null);
      if (reservations.length <= 1 && page > 1 && statusFilter !== 'all') {
        setPage(page - 1);
      } else {
        await fetchPage(page);
      }
      if (selectedReservation?.id === resId) {
        setSelectedReservation((prev) =>
          prev
            ? {
                ...prev,
                status: 'cancelled',
                paymentStatus: 'refunded',
                cancelledBy: 'admin',
                rejectionReason: cancellationReason,
              }
            : null
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to cancel reservation');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const renderStatusBadge = (status: ReservationStatus) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border';
    switch (status) {
      case 'confirmed':
        return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>Confirmed</span>;
      case 'pending':
        return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>Pending</span>;
      case 'completed':
        return <span className={`${base} bg-blue-100 text-blue-800 border-blue-200`}>Completed</span>;
      case 'cancelled':
        return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Cancelled</span>;
      case 'rejected':
        return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Rejected</span>;
      case 'expired':
        return <span className={`${base} bg-neutral-100 text-neutral-600 border-neutral-300`}>Expired</span>;
      default:
        return <span className={`${base} bg-neutral-100 text-neutral-700 border-neutral-200`}>{status}</span>;
    }
  };

  const renderPaymentBadge = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'captured':
        return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">Captured</span>;
      case 'authorized':
        return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">Hold</span>;
      case 'refunded':
        return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">Refunded</span>;
      case 'voided':
        return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300">Voided</span>;
      default:
        return <span className="text-xs text-neutral-400">{paymentStatus || 'Pending'}</span>;
    }
  };

  const gmvUSD = summary.gmvCents / 100;
  const commissionUSD = summary.commissionCents / 100;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[var(--color-bg-dark)] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-[var(--color-border-dark)] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inline Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Audit Summary Cards (SQL-aggregated across all reservations) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Total Bookings
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-on-light)] mt-1">
            {summary.totalCount}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {summary.confirmedCount} confirmed · {summary.pendingCount} pending
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Active Stay Pipeline
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.confirmedCount} Stays
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {summary.cancelledCount} cancellations
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Confirmed GMV
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-on-light)] mt-1">
            ${Math.round(gmvUSD).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Platform gross rental volume
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Platform Commission (10%)
          </div>
          <div className="text-2xl font-bold text-[var(--color-brand)] mt-1">
            ${Math.round(commissionUSD).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Net NomadDesk platform revenue
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-sm py-1.5 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
            >
              <option value="all">All Statuses ({counts.all})</option>
              <option value="confirmed">Confirmed ({counts.confirmed})</option>
              <option value="pending">Pending ({counts.pending})</option>
              <option value="completed">Completed ({counts.completed})</option>
              <option value="cancelled">Cancelled ({counts.cancelled})</option>
              <option value="rejected">Rejected ({counts.rejected})</option>
              <option value="expired">Expired ({counts.expired})</option>
            </select>
          </div>

          {/* Host Filter */}
          <div>
            <select
              aria-label="Filter by host"
              value={hostFilter}
              onChange={(e) => {
                setHostFilter(e.target.value);
                setPage(1);
              }}
              className="text-sm py-1.5 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
            >
              <option value="all">All Hosts ({hosts.length})</option>
              {hosts.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            aria-label="Search reservations by booking code, guest, or city"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Booking code, guest, city..."
            className="w-full text-sm py-1.5 pl-9 pr-3 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <tr>
                <th className="px-6 py-3.5">Booking ID</th>
                <th className="px-6 py-3.5">Guest</th>
                <th className="px-6 py-3.5">Host</th>
                <th className="px-6 py-3.5">City</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Commission</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      <span>Loading booking audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                        <BookmarkCheck className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-[var(--color-text-on-light)]">No reservations found</p>
                      <p className="text-xs text-[var(--color-text-on-light-muted)]">
                        {searchQuery || statusFilter !== 'all' || hostFilter !== 'all'
                          ? 'Try adjusting your search criteria.'
                          : 'There are currently no reservations on the platform.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reservations.map((res) => {
                  const prop = getProperty(res.propertyId);
                  const hostName = getHostName(res.propertyId);
                  const totalUSD = Math.round((res.totalAmount || 0) / 100);
                  const commissionCents =
                    res.commissionAmount ??
                    Math.round((res.rentAmount || 0) * BOOKING_RULES.commissionRate);
                  const commissionItemUSD = Math.round(commissionCents / 100);

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      {/* Booking Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedReservation(res)}
                          className="font-bold text-[var(--color-brand)] hover:underline text-left block cursor-pointer"
                        >
                          #{res.code}
                        </button>
                        <span className="text-[11px] text-neutral-500">
                          {formatUtcDate(res.createdAt)}
                        </span>
                      </td>

                      {/* Guest */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--color-text-on-light)]">
                          {res.guestName}
                        </div>
                        <div className="text-xs text-[var(--color-text-on-light-muted)]">
                          {res.guestEmail}
                        </div>
                      </td>

                      {/* Host */}
                      <td className="px-6 py-4 text-[var(--color-text-on-light)] whitespace-nowrap">
                        {hostName}
                      </td>

                      {/* City */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-[var(--color-text-on-light)]">
                          {prop ? prop.city : 'N/A'}
                        </span>
                        {prop && (
                          <div className="text-xs text-neutral-400 max-w-[140px] truncate">
                            {prop.title}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 font-bold text-[var(--color-text-on-light)] whitespace-nowrap">
                        ${totalUSD.toLocaleString()}
                      </td>

                      {/* Commission */}
                      <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ${commissionItemUSD.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div>{renderStatusBadge(res.status)}</div>
                          <div>{renderPaymentBadge(res.paymentStatus)}</div>
                        </div>
                      </td>

                      {/* Intervention / Actions (AC-ADMIN-4) */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReservation(res)}
                            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-semibold px-2.5 py-1.5 transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          {/* Admin Void button on confirmed reservations */}
                          {res.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReservation(null);
                                setVoidingReservation(res);
                                setCancellationReason('Cancelled by Platform Administrator due to compliance review');
                              }}
                              disabled={isSubmitting}
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold px-2.5 py-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                              title="Admin Intervention Void & Refund"
                            >
                              Admin Void
                            </button>
                          )}

                          {res.status === 'cancelled' && res.cancelledBy === 'admin' && (
                            <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              Admin Voided
                            </span>
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
          itemLabel="reservations"
        />
      </div>

      {/* Modal: Reservation Details Drawer */}
      {selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setSelectedReservation(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Reservation audit details for #${selectedReservation.code}`}
            className="w-full max-w-xl bg-white max-h-[90vh] rounded-2xl shadow-2xl p-6 overflow-y-auto border border-[var(--color-border-light)] space-y-6"
          >
            <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-[var(--color-brand)]">
                    #{selectedReservation.code}
                  </span>
                  {renderStatusBadge(selectedReservation.status)}
                  {renderPaymentBadge(selectedReservation.paymentStatus)}
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-on-light)]">
                  Reservation Audit Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                aria-label="Close reservation details"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="space-y-4 text-sm">
              {/* Stay Period & Property */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                  Stay & Property
                </div>
                <div className="font-semibold text-base text-[var(--color-text-on-light)]">
                  {getProperty(selectedReservation.propertyId)?.title || `Property #${selectedReservation.propertyId}`}
                </div>
                <div className="text-xs text-[var(--color-text-on-light-muted)]">
                  City: {getProperty(selectedReservation.propertyId)?.city} · Host: {getHostName(selectedReservation.propertyId)}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light)] pt-1">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span>
                    <strong>{selectedReservation.moveInDate}</strong> → <strong>{selectedReservation.moveOutDate}</strong> ({selectedReservation.nights} nights)
                  </span>
                </div>
              </div>

              {/* Guest & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                    Guest Information
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-text-on-light)]">
                    {selectedReservation.guestName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {selectedReservation.guestEmail}
                  </div>
                  {selectedReservation.guestPhone && (
                    <div className="text-xs text-neutral-500">
                      Phone: {selectedReservation.guestPhone}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                    Financial Audit
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Total Charged:</span>
                    <strong className="text-[var(--color-text-on-light)]">
                      ${Math.round((selectedReservation.totalAmount || 0) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">NomadDesk 10% Cut:</span>
                    <strong className="text-emerald-600">
                      ${Math.round((selectedReservation.commissionAmount ?? Math.round((selectedReservation.rentAmount || 0) * BOOKING_RULES.commissionRate)) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Host Net Payout:</span>
                    <strong className="text-[var(--color-text-on-light)]">
                      ${Math.round((selectedReservation.hostPayout ?? Math.round((selectedReservation.rentAmount || 0) * (1 - BOOKING_RULES.commissionRate))) / 100).toLocaleString()}
                    </strong>
                  </div>
                  {selectedReservation.paymentRef && (
                    <div className="text-[11px] text-neutral-400 truncate pt-1">
                      Ref: {selectedReservation.paymentRef}
                    </div>
                  )}
                </div>
              </div>

              {/* Cancellation Audit Notice if cancelled */}
              {selectedReservation.status === 'cancelled' && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-800 dark:text-red-300 space-y-1 text-xs">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Cancellation Event Audit
                  </div>
                  <p>
                    Cancelled by: <strong className="uppercase">{selectedReservation.cancelledBy || 'system'}</strong>
                  </p>
                  {selectedReservation.rejectionReason && (
                    <p>Reason: {selectedReservation.rejectionReason}</p>
                  )}
                  <p className="text-neutral-500 pt-0.5">
                    Payment marked as: <strong>{selectedReservation.paymentStatus}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[var(--color-border-light)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Close
              </button>

              {/* Admin Void action from details */}
              {selectedReservation.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedReservation;
                    setSelectedReservation(null);
                    setVoidingReservation(target);
                    setCancellationReason('Cancelled by Platform Administrator due to compliance review');
                  }}
                  className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  Admin Void & Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Intervention Void Confirmation */}
      {voidingReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setVoidingReservation(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Cancel booking #${voidingReservation.code}`}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[var(--color-text-on-light)]">
                  Admin Intervention: Cancel Booking
                </h4>
                <p className="text-xs text-[var(--color-text-on-light-muted)]">
                  Booking #{voidingReservation.code} ({voidingReservation.guestName})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              <p className="font-semibold">Platform Intervention Warning:</p>
              <p>
                This action will immediately cancel this confirmed booking, release the property dates on the calendar, and mark the transaction payment status as <strong>Refunded</strong>.
              </p>
            </div>

            <div>
              <label
                htmlFor="admin-void-reason"
                className="block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1"
              >
                Reason for Admin Intervention:
              </label>
              <textarea
                id="admin-void-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-lg border border-[var(--color-border-light)] bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Reason for intervention..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVoidingReservation(null)}
                className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminCancel}
                disabled={isSubmitting || !cancellationReason.trim()}
                className="inline-flex min-h-10 sm:min-h-8 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                Execute Admin Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
