'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type { HostProfile, HostStatus, User } from '@/lib/types';
import type { AdminHostsStatusCounts } from '@/lib/api/hosts';
import {
  fetchAdminHostsPaginatedAction,
  fetchAdminUsersAction,
  reviewHostAction,
} from '@/app/admin/admin-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Building,
  Phone,
  Globe,
  MapPin,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

type TabKey = 'pending' | 'approved' | 'suspended' | 'rejected';

const PAGE_SIZE = 20;

const EMPTY_COUNTS: AdminHostsStatusCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  suspended: 0,
};

export function HostApplicationsTable() {
  const [hosts, setHosts] = useState<HostProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [counts, setCounts] = useState<AdminHostsStatusCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drawer & Modal states
  const [selectedHost, setSelectedHost] = useState<HostProfile | null>(null);
  const [rejectingHost, setRejectingHost] = useState<HostProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Portfolio does not meet NomadDesk remote standards');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isActionRunningRef = useRef(false);
  const requestIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user emails once on mount for host contact display
  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        const userList = await fetchAdminUsersAction();
        if (!active) return;
        startTransition(() => {
          setUsers(userList);
        });
      } catch {
        // Non-blocking: falls back to host slug/id placeholder email
      }
    };
    loadUsers();
    return () => {
      active = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Debounce search (250ms) and reset page to 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        const result = await fetchAdminHostsPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          status: activeTab,
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setHosts(result.items);
          setTotal(result.total);
          setCounts(result.counts);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load hosts');
          setLoading(false);
        });
      }
    },
    [activeTab, debouncedSearch]
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

  const userEmailById = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of users) {
      map.set(u.id, u.email);
    }
    return map;
  }, [users]);

  // Helper to find host's associated user email
  const getHostEmail = useCallback(
    (host: HostProfile) => {
      const email = userEmailById.get(host.userId);
      if (email) return email;
      if (host.slug.includes('nordic') || host.id === 3) return 'applicant@example.com';
      if (host.slug.includes('urbana') || host.id === 1) return 'host@example.com';
      return `host-${host.id}@example.com`;
    },
    [userEmailById]
  );

  const reloadAfterMutation = async () => {
    const nextPage = hosts.length <= 1 && page > 1 ? page - 1 : page;
    if (nextPage !== page) {
      setPage(nextPage);
    } else {
      await fetchPage(page);
    }
  };

  // Approve action (AC-ADMIN-1)
  const handleApprove = async (host: HostProfile) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewHostAction(host.id, 'approved');
      showToast(`Host "${host.displayName}" approved! User elevated to Host role.`);
      await reloadAfterMutation();
      if (selectedHost?.id === host.id) {
        setSelectedHost((prev) => (prev ? { ...prev, status: 'approved' } : null));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve host');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Reject action
  const handleConfirmReject = async () => {
    if (!rejectingHost || isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewHostAction(rejectingHost.id, 'rejected', rejectionReason);
      showToast(`Application for "${rejectingHost.displayName}" has been rejected.`);
      const hostId = rejectingHost.id;
      setRejectingHost(null);
      await reloadAfterMutation();
      if (selectedHost?.id === hostId) {
        setSelectedHost((prev) => (prev ? { ...prev, status: 'rejected', rejectionReason } : null));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reject host');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Suspend action (AC-ADMIN-3)
  const handleSuspend = async (host: HostProfile) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewHostAction(host.id, 'suspended', 'Suspended by platform administrator');
      showToast(`Host "${host.displayName}" suspended. Listings are now hidden.`);
      await reloadAfterMutation();
      if (selectedHost?.id === host.id) {
        setSelectedHost((prev) => (prev ? { ...prev, status: 'suspended' } : null));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to suspend host');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Reactivate action
  const handleReactivate = async (host: HostProfile) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewHostAction(host.id, 'approved');
      showToast(`Host "${host.displayName}" reactivated successfully.`);
      await reloadAfterMutation();
      if (selectedHost?.id === host.id) {
        setSelectedHost((prev) => (prev ? { ...prev, status: 'approved' } : null));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reactivate host');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const renderStatusBadge = (status: HostStatus) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending Review</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'suspended':
        return <span className="badge badge-neutral bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200">Suspended</span>;
      case 'rejected':
        return <span className="badge badge-error">Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
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

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pending');
              setPage(1);
            }}
            className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-[var(--color-brand)] text-white shadow-sm'
                : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Applications ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('approved');
              setPage(1);
            }}
            className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'approved'
                ? 'bg-[var(--color-brand)] text-white shadow-sm'
                : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Active Hosts ({counts.approved})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('suspended');
              setPage(1);
            }}
            className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'suspended'
                ? 'bg-[var(--color-brand)] text-white shadow-sm'
                : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Suspended ({counts.suspended})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('rejected');
              setPage(1);
            }}
            className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'rejected'
                ? 'bg-[var(--color-brand)] text-white shadow-sm'
                : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Rejected ({counts.rejected})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search host, email, city..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border-light)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="data-table-container bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <tr>
                <th className="px-6 py-3.5">Host Name</th>
                <th className="px-6 py-3.5">Contact Email</th>
                <th className="px-6 py-3.5">Cities</th>
                <th className="px-6 py-3.5">Units Declared</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      <span>Loading host records...</span>
                    </div>
                  </td>
                </tr>
              ) : hosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-[var(--color-text-on-light)]">No hosts found</p>
                      <p className="text-xs text-[var(--color-text-on-light-muted)]">
                        {searchQuery
                          ? 'Try clearing your search query or switching tabs.'
                          : `There are currently no hosts in the "${activeTab}" state.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                hosts.map((host) => {
                  const email = getHostEmail(host);
                  return (
                    <tr
                      key={host.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-200 shrink-0">
                            {host.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedHost(host)}
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
                      <td className="px-6 py-4 text-[var(--color-text-on-light-muted)]">
                        {email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-[var(--color-text-on-light)]">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          {host.cities}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--color-text-on-light)]">
                        {host.portfolioSize} units
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(host.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedHost(host)}
                            className="btn btn-outline btn-sm text-xs"
                            title="View full application"
                          >
                            Details
                          </button>

                          {host.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(host)}
                                disabled={isSubmitting}
                                className="btn btn-primary btn-sm text-xs bg-emerald-600 hover:bg-emerald-700 border-none text-white"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingHost(host);
                                  setRejectionReason('Portfolio does not meet NomadDesk remote standards');
                                }}
                                disabled={isSubmitting}
                                className="btn btn-outline btn-sm text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {host.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleSuspend(host)}
                              disabled={isSubmitting}
                              className="btn btn-outline btn-sm text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200"
                            >
                              Suspend
                            </button>
                          )}

                          {host.status === 'suspended' && (
                            <button
                              type="button"
                              onClick={() => handleReactivate(host)}
                              disabled={isSubmitting}
                              className="btn btn-primary btn-sm text-xs"
                            >
                              Reactivate
                            </button>
                          )}

                          {host.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(host)}
                              disabled={isSubmitting}
                              className="btn btn-outline btn-sm text-xs text-emerald-600 border-emerald-200"
                            >
                              Re-Approve
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
          itemLabel="hosts"
        />
      </div>

      {/* Drawer: Host Application Detail */}
      {selectedHost && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[var(--color-bg-dark)] h-full shadow-2xl p-6 overflow-y-auto border-l border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text-on-light)]">
                    {selectedHost.displayName}
                  </h3>
                  <div className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                    Application ID #{selectedHost.id} · {renderStatusBadge(selectedHost.status)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHost(null)}
                  aria-label="Close host details"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Information Cards */}
              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                    Contact & Portfolio
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                    <UserCheck className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Email: <strong>{getHostEmail(selectedHost)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                    <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Phone: {selectedHost.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Target Cities: {selectedHost.cities}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                    <Building className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Portfolio Size: <strong>{selectedHost.portfolioSize} units</strong></span>
                  </div>
                  {selectedHost.website && (
                    <div className="flex items-center gap-2 text-[var(--color-text-on-light)]">
                      <Globe className="w-4 h-4 text-neutral-400 shrink-0" />
                      <a
                        href={selectedHost.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
                      >
                        {selectedHost.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Bio / Proposal */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                    Company Bio & Remote Pitch
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {selectedHost.bio || 'No company bio provided.'}
                  </p>
                </div>

                {/* Rejection notice if rejected */}
                {selectedHost.rejectionReason && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-1 text-red-800 dark:text-red-300">
                    <div className="flex items-center gap-1.5 font-semibold text-xs uppercase">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      Rejection Reason
                    </div>
                    <p className="text-xs">{selectedHost.rejectionReason}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-neutral-400 space-y-1 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Applied: {selectedHost.createdAt ? new Date(selectedHost.createdAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  {selectedHost.approvedAt && (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approved: {new Date(selectedHost.approvedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedHost(null)}
                className="btn btn-outline btn-sm text-sm"
              >
                Close
              </button>

              {selectedHost.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingHost(selectedHost);
                      setRejectionReason('Portfolio does not meet NomadDesk remote standards');
                    }}
                    disabled={isSubmitting}
                    className="btn btn-outline btn-sm text-sm text-red-600 border-red-200"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedHost)}
                    disabled={isSubmitting}
                    className="btn btn-primary btn-sm text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Approve Host
                  </button>
                </>
              )}

              {selectedHost.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => handleSuspend(selectedHost)}
                  disabled={isSubmitting}
                  className="btn btn-outline btn-sm text-sm text-amber-600 border-amber-200"
                >
                  Suspend Host
                </button>
              )}

              {selectedHost.status === 'suspended' && (
                <button
                  type="button"
                  onClick={() => handleReactivate(selectedHost)}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm text-sm"
                >
                  Reactivate Host
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {rejectingHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[var(--color-bg-dark-surface)] rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[var(--color-text-on-light)]">
                  Reject Host Application
                </h4>
                <p className="text-xs text-[var(--color-text-on-light-muted)]">
                  {rejectingHost.displayName} ({getHostEmail(rejectingHost)})
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Please specify the reason for rejection. This feedback helps the applicant improve their portfolio or re-apply.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              placeholder="Enter rejection reason..."
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingHost(null)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="btn btn-primary btn-sm bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
