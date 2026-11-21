'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type { Reservation, ReservationStatus, Property, HostProfile } from '@/lib/types';
import { listReservations, updateReservationStatus } from '@/lib/api/reservations';
import { listProperties } from '@/lib/api/properties';
import { listHosts } from '@/lib/api/hosts';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  BookmarkCheck,
  Calendar,
  ShieldAlert,
  X,
} from 'lucide-react';

export function AllReservationsTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [hosts, setHosts] = useState<HostProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Intervention modal & detail modal
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [voidingReservation, setVoidingReservation] = useState<Reservation | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Cancelled by Platform Administrator due to compliance review');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isActionRunningRef = useRef(false);

  const fetchData = async () => {
    try {
      const [resList, propList, hostList] = await Promise.all([
        listReservations({ status: 'all' }),
        listProperties({ status: 'all' }),
        listHosts(),
      ]);
      startTransition(() => {
        setReservations(resList);
        setProperties(propList);
        setHosts(hostList);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Property & Host lookup helpers
  const getProperty = useCallback((propertyId: number) => {
    return properties.find((p) => p.id === propertyId);
  }, [properties]);

  const getHostName = useCallback((propertyId: number) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return 'Unknown Host';
    const host = hosts.find((h) => h.id === prop.hostId);
    return host ? host.displayName : `Host #${prop.hostId}`;
  }, [properties, hosts]);

  // KPI Summary stats
  const summary = useMemo(() => {
    const total = reservations.length;
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length;
    const pending = reservations.filter((r) => r.status === 'pending').length;
    const cancelled = reservations.filter((r) => r.status === 'cancelled').length;

    // GMV & Commission from confirmed reservations
    const confirmedList = reservations.filter((r) => r.status === 'confirmed');
    const gmvUSD = confirmedList.reduce((sum, r) => sum + (r.totalAmount || 0), 0) / 100;
    const commissionUSD = confirmedList.reduce(
      (sum, r) => sum + (r.commissionAmount || Math.round((r.totalAmount || 0) * 0.1)),
      0
    ) / 100;

    return { total, confirmed, pending, cancelled, gmvUSD, commissionUSD };
  }, [reservations]);

  // Admin Intervention Cancel / Void action (AC-ADMIN-4)
  const handleConfirmAdminCancel = async () => {
    if (!voidingReservation || isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);

    try {
      // AC-ADMIN-4: Admin cancels confirmed booking -> cancelledBy = 'admin', paymentStatus = 'refunded'
      await updateReservationStatus(
        voidingReservation.id,
        'cancelled',
        cancellationReason,
        'admin'
      );
      showToast(`Reservation #${voidingReservation.code} cancelled by Admin. Refund processed.`);
      const resId = voidingReservation.id;
      setVoidingReservation(null);
      await fetchData();
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
      alert(err instanceof Error ? err.message : 'Failed to cancel reservation');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Host filter
      if (hostFilter !== 'all') {
        const prop = getProperty(r.propertyId);
        if (!prop || String(prop.hostId) !== hostFilter) return false;
      }

      // Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prop = getProperty(r.propertyId);
        const hostName = getHostName(r.propertyId).toLowerCase();
        return (
          r.code.toLowerCase().includes(q) ||
          r.guestName.toLowerCase().includes(q) ||
          r.guestEmail.toLowerCase().includes(q) ||
          hostName.includes(q) ||
          (prop && prop.city.toLowerCase().includes(q)) ||
          (prop && prop.title.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [reservations, statusFilter, hostFilter, searchQuery, getProperty, getHostName]);

  const renderStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge badge-success">Confirmed</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'completed':
        return <span className="badge bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      case 'rejected':
        return <span className="badge badge-error">Rejected</span>;
      case 'expired':
        return <span className="badge bg-neutral-100 text-neutral-600 border border-neutral-300">Expired</span>;
      default:
        return <span className="badge">{status}</span>;
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
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Audit Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Total Bookings
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-on-light)] mt-1">
            {summary.total}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {summary.confirmed} confirmed · {summary.pending} pending
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Active Stay Pipeline
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.confirmed} Stays
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {summary.cancelled} cancellations
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
          <div className="text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider">
            Confirmed GMV
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-on-light)] mt-1">
            ${summary.gmvUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
            ${summary.commissionUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm py-1.5 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
            >
              <option value="all">All Statuses ({reservations.length})</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Host Filter */}
          <div>
            <select
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Booking code, guest, city..."
            className="w-full text-sm py-1.5 pl-9 pr-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="data-table-container bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
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
              ) : filteredReservations.length === 0 ? (
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
                filteredReservations.map((res) => {
                  const prop = getProperty(res.propertyId);
                  const hostName = getHostName(res.propertyId);
                  const totalUSD = Math.round((res.totalAmount || 0) / 100);
                  const commissionUSD = Math.round(
                    (res.commissionAmount || (res.totalAmount || 0) * 0.1) / 100
                  );

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Booking Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReservation(res)}
                          className="font-bold text-[var(--color-brand)] hover:underline text-left block"
                        >
                          #{res.code}
                        </button>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(res.createdAt).toLocaleDateString()}
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
                        ${commissionUSD.toLocaleString()}
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
                            onClick={() => setSelectedReservation(res)}
                            className="btn btn-outline btn-sm text-xs px-2.5 py-1"
                          >
                            Details
                          </button>

                          {/* Admin Void button on confirmed reservations (AC-ADMIN-4) */}
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => {
                                setVoidingReservation(res);
                                setCancellationReason('Cancelled by Platform Administrator due to compliance review');
                              }}
                              disabled={isSubmitting}
                              className="btn btn-outline btn-sm text-xs px-2.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200"
                              title="Admin Intervention Void & Refund"
                            >
                              Admin Void
                            </button>
                          )}

                          {res.status === 'cancelled' && res.cancelledBy === 'admin' && (
                            <span className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded">
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
      </div>

      {/* Modal: Reservation Details Drawer */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[var(--color-bg-dark)] max-h-[90vh] rounded-2xl shadow-2xl p-6 overflow-y-auto border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-6">
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
                onClick={() => setSelectedReservation(null)}
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
                      ${Math.round((selectedReservation.commissionAmount || (selectedReservation.totalAmount || 0) * 0.1) / 100).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Host Net Payout:</span>
                    <strong className="text-[var(--color-text-on-light)]">
                      ${Math.round((selectedReservation.hostPayout || (selectedReservation.totalAmount || 0) * 0.9) / 100).toLocaleString()}
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
            <div className="pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Close
              </button>

              {/* Admin Void action from details (AC-ADMIN-4) */}
              {selectedReservation.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => {
                    setVoidingReservation(selectedReservation);
                    setCancellationReason('Cancelled by Platform Administrator due to compliance review');
                  }}
                  className="btn btn-primary btn-sm text-xs bg-red-600 hover:bg-red-700 text-white"
                >
                  Admin Void & Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Intervention Void Confirmation (AC-ADMIN-4) */}
      {voidingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[var(--color-bg-dark-surface)] rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
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

            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-xs text-red-800 dark:text-red-300 space-y-1">
              <p className="font-semibold">Platform Intervention Warning (AC-ADMIN-4):</p>
              <p>
                This action will immediately cancel this confirmed booking, release the property dates on the calendar, and mark the transaction payment status as <strong>Refunded</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1">
                Reason for Admin Intervention:
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="Reason for intervention..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVoidingReservation(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminCancel}
                disabled={isSubmitting || !cancellationReason.trim()}
                className="btn btn-primary btn-sm text-xs bg-red-600 hover:bg-red-700 text-white"
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
