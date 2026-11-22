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
import type { AdminDashboardPeriod, AdminDashboardStats } from '@/lib/api/reservations';
import type { HostProfile, Property } from '@/lib/types';
import { Users, Settings, X, Sparkles, AlertTriangle, Calendar, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReasonPromptModal } from '@/features/admin/reason-prompt-modal';
import { HostApplicationsQueue } from '@/features/admin/dashboard/host-applications-queue';
import { PropertyModerationQueue } from '@/features/admin/dashboard/property-moderation-queue';
import { AdminShortcuts } from '@/features/admin/dashboard/admin-shortcuts';

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

  const handleConfirmRejectHost = async (rejectionReason: string) => {
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
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === opt.value
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900',
              )}
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
        <HostApplicationsQueue
          pendingHosts={pendingHosts}
          pendingCount={dashboardStats?.pendingHosts ?? pendingHosts.length}
          loading={loadingQueues}
          isSubmitting={isSubmitting}
          onApprove={(host) => handleApproveHost(host.id, host.displayName)}
          onReject={setRejectingHost}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PropertyModerationQueue
            pendingProperties={pendingProperties}
            pendingCount={dashboardStats?.pendingProperties ?? pendingProperties.length}
            loading={loadingQueues}
          />
          <AdminShortcuts />
        </div>
      </div>

      {rejectingHost && (
        <ReasonPromptModal
          ariaLabel={`Reject host application for ${rejectingHost.displayName}`}
          icon={ShieldAlert}
          title="Reject Host Application"
          subtitle={`${rejectingHost.displayName} (${rejectingHost.userEmail || '—'})`}
          description="Specify the rejection reason so the applicant can address any gaps before re-applying."
          defaultReason="Portfolio does not meet remote work housing standards"
          confirmLabel={isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          isSubmitting={isSubmitting}
          onCancel={() => setRejectingHost(null)}
          onConfirm={handleConfirmRejectHost}
        />
      )}
    </div>
  );
}
