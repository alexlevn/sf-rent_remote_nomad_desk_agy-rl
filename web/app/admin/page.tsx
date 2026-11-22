'use client';

import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import Link from 'next/link';
import {
  AdminKpiCards,
  type AdminKpiStats,
} from '@/features/admin/admin-kpi-cards';
import {
  fetchAdminDashboardStatsAction,
  fetchAdminHostsPaginatedAction,
  fetchAdminPropertiesPaginatedAction,
  reviewHostAction,
} from '@/app/admin/admin-actions';
import { formatUtcDate } from '@/lib/format';
import { SITE_CONFIG } from '@/content/site';
import type { AdminDashboardPeriod, AdminDashboardStats } from '@/lib/api/reservations';
import type { HostProfile, Property } from '@/lib/types';
import {
  UserCheck,
  Building,
  BookmarkCheck,
  Users,
  Settings,
  ArrowRight,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

const PERIOD_OPTIONS: Array<{ value: AdminDashboardPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' },
];

const EMPTY_STATS: AdminKpiStats = {
  publishedProperties: 0,
  activeHosts: 0,
  pendingHosts: 0,
  pendingProperties: 0,
  totalReservations: 0,
  estimatedGmvUSD: 0,
  netCommissionUSD: 0,
};

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<AdminDashboardPeriod>('all');
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [pendingHosts, setPendingHosts] = useState<HostProfile[]>([]);
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [rejectingHost, setRejectingHost] = useState<HostProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState(
    'Portfolio does not meet remote work housing standards'
  );
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statsRequestIdRef = useRef(0);
  const queuesRequestIdRef = useRef(0);
  const isActionRunningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async (selectedPeriod: AdminDashboardPeriod) => {
    const reqId = ++statsRequestIdRef.current;
    setLoadingStats(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminDashboardStatsAction(selectedPeriod);
      if (reqId !== statsRequestIdRef.current) return;
      startTransition(() => {
        setDashboardStats(data);
        setLoadingStats(false);
      });
    } catch (err) {
      if (reqId !== statsRequestIdRef.current) return;
      startTransition(() => {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
        setLoadingStats(false);
      });
    }
  }, []);

  const loadQueues = useCallback(async () => {
    const reqId = ++queuesRequestIdRef.current;
    setLoadingQueues(true);
    setErrorMessage(null);
    try {
      const [hostsPage, propsPage] = await Promise.all([
        fetchAdminHostsPaginatedAction({ status: 'pending', page: 1, pageSize: 10 }),
        fetchAdminPropertiesPaginatedAction({ status: 'pending_review', page: 1, pageSize: 10 }),
      ]);
      if (reqId !== queuesRequestIdRef.current) return;
      startTransition(() => {
        setPendingHosts(hostsPage.items);
        setPendingProperties(propsPage.items);
        setLoadingQueues(false);
      });
    } catch (err) {
      if (reqId !== queuesRequestIdRef.current) return;
      startTransition(() => {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load approval queues');
        setLoadingQueues(false);
      });
    }
  }, []);

  useEffect(() => {
    if (!rejectingHost) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActionRunningRef.current) {
        setRejectingHost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectingHost]);

  useEffect(() => {
    loadStats(period);
  }, [period, loadStats]);

  useEffect(() => {
    loadQueues();
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadQueues]);

  const showNotification = (msg: string) => {
    setErrorMessage(null);
    setNotification(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setNotification(null), 4000);
  };

  const handleApproveHost = async (hostId: number, displayName: string) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewHostAction(hostId, 'approved');
      showNotification(`Host application for "${displayName}" has been approved!`);
      await Promise.all([loadStats(period), loadQueues()]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve host');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleConfirmRejectHost = async () => {
    if (!rejectingHost || !rejectionReason.trim() || isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reviewHostAction(rejectingHost.id, 'rejected', rejectionReason.trim());
      showNotification(`Host application for "${rejectingHost.displayName}" was rejected.`);
      setRejectingHost(null);
      await Promise.all([loadStats(period), loadQueues()]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reject host');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const kpiStats: AdminKpiStats = dashboardStats
    ? {
        publishedProperties: dashboardStats.publishedProperties,
        activeHosts: dashboardStats.activeHosts,
        pendingHosts: dashboardStats.pendingHosts,
        pendingProperties: dashboardStats.pendingProperties,
        totalReservations: dashboardStats.totalReservations,
        estimatedGmvUSD: dashboardStats.estimatedGmvUSD,
        netCommissionUSD: dashboardStats.netCommissionUSD,
      }
    : EMPTY_STATS;

  const activePeriodLabel =
    PERIOD_OPTIONS.find((opt) => opt.value === period)?.label ?? 'All Time';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">Dashboard</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
              Platform Executive Overview
            </h1>
            <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
              Real-time platform activity, property inventory, and pending approval queues.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>FX Settings</span>
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] shadow-sm transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Users</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-[var(--color-border-light)] px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)]">
          <Calendar className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
          <span>
            Metrics window:{' '}
            <strong className="text-[var(--color-text-on-light)]">{activePeriodLabel}</strong>
            {dashboardStats && (
              <span className="ml-2 text-neutral-500">
                · {dashboardStats.newUsers} new users · {dashboardStats.newProperties} new listings
              </span>
            )}
          </span>
        </div>
        <div
          role="group"
          aria-label="Dashboard period filter"
          data-testid="dashboard-period-switcher"
          className="inline-flex items-center gap-1 rounded-xl bg-neutral-100 p-1"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`dashboard-period-${opt.value}`}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === opt.value
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-medium flex items-center justify-between shadow-sm animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs md:text-sm font-medium flex items-center justify-between shadow-sm"
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

      {/* KPI Cards Grid */}
      <div className={loadingStats ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <AdminKpiCards stats={kpiStats} />
      </div>

      {/* Action Queues Section */}
      <div className="space-y-6">
        {/* Queue: Host Applications */}
        <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base md:text-lg font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <span>Queue: Host Membership Applications Awaiting Approval</span>
                {(dashboardStats?.pendingHosts ?? pendingHosts.length) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[var(--color-brand)]">
                    {dashboardStats?.pendingHosts ?? pendingHosts.length} pending
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
                              onClick={() => handleApproveHost(host.id, host.displayName)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => {
                                setRejectingHost(host);
                                setRejectionReason('Portfolio does not meet remote work housing standards');
                              }}
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

        {/* Two-column layout for Property Moderation and Quick Platform Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue: Property Moderations */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--color-border-light)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                  <span>Property Moderation Queue</span>
                  {(dashboardStats?.pendingProperties ?? pendingProperties.length) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {dashboardStats?.pendingProperties ?? pendingProperties.length} pending
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

          {/* Quick Platform Navigation & Shortcuts */}
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
        </div>
      </div>

      {/* Reject Host Modal */}
      {rejectingHost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setRejectingHost(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Reject host application for ${rejectingHost.displayName}`}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[var(--color-text-on-light)]">
                  Reject Host Application
                </h4>
                <p className="text-xs text-[var(--color-text-on-light-muted)]">
                  {rejectingHost.displayName} ({rejectingHost.userEmail || '—'})
                </p>
              </div>
            </div>

            <label
              htmlFor="dashboard-reject-host-reason"
              className="block text-sm text-neutral-600"
            >
              Specify the rejection reason so the applicant can address any gaps before re-applying.
            </label>

            <textarea
              id="dashboard-reject-host-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-lg border border-[var(--color-border-light)] bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              placeholder="Enter rejection reason..."
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingHost(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectHost}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
