'use client';

import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import type { HostProfile } from '@/lib/types';
import type { AdminHostsStatusCounts } from '@/lib/api/hosts';
import { fetchAdminHostsPaginatedAction, reviewHostAction } from '@/app/admin/admin-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { Search, UserCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DarkToast, ErrorBanner } from '@/features/admin/admin-feedback';
import { ReasonPromptModal } from '@/features/admin/reason-prompt-modal';
import { HostDetailDrawer, getHostEmail, type HostReviewActions } from '@/features/admin/hosts/host-detail-drawer';
import { HostRow } from '@/features/admin/hosts/host-row';

type TabKey = 'pending' | 'approved' | 'suspended' | 'rejected';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const TOAST_DURATION_MS = 3500;

const TABS: ReadonlyArray<{ id: TabKey; label: string }> = [
  { id: 'pending', label: 'Applications' },
  { id: 'approved', label: 'Active Hosts' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
];

const EMPTY_COUNTS: AdminHostsStatusCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  suspended: 0,
};

export function HostApplicationsTable() {
  const [hosts, setHosts] = useState<HostProfile[]>([]);
  const [counts, setCounts] = useState<AdminHostsStatusCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedHost, setSelectedHost] = useState<HostProfile | null>(null);
  const [rejectingHost, setRejectingHost] = useState<HostProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isActionRunningRef = useRef(false);
  const requestIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedHost && !rejectingHost) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActionRunningRef.current) {
        if (rejectingHost) setRejectingHost(null);
        else setSelectedHost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHost, rejectingHost]);

  // Debounce search and reset page to 1 only when the trimmed query changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setErrorMessage(null);
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
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  };

  const reloadAfterMutation = async () => {
    const nextPage = hosts.length <= 1 && page > 1 ? page - 1 : page;
    if (nextPage !== page) setPage(nextPage);
    else await fetchPage(page);
  };

  // Runs one review action at a time, then refreshes the list and the open drawer
  const runReview = async (
    host: HostProfile,
    action: () => Promise<unknown>,
    successMessage: string,
    fallbackError: string,
    patch: Partial<HostProfile>
  ) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await action();
      showToast(successMessage);
      await reloadAfterMutation();
      if (selectedHost?.id === host.id) {
        setSelectedHost((prev) => (prev ? { ...prev, ...patch } : null));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : fallbackError);
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const actions: HostReviewActions = {
    isSubmitting,
    // AC-ADMIN-1
    onApprove: (host) =>
      runReview(
        host,
        () => reviewHostAction(host.id, 'approved'),
        `Host "${host.displayName}" approved! User elevated to Host role.`,
        'Failed to approve host',
        { status: 'approved' }
      ),
    onStartReject: (host) => {
      setSelectedHost(null);
      setRejectingHost(host);
    },
    // AC-ADMIN-3
    onSuspend: (host) =>
      runReview(
        host,
        () => reviewHostAction(host.id, 'suspended', 'Suspended by platform administrator'),
        `Host "${host.displayName}" suspended. Listings are now hidden.`,
        'Failed to suspend host',
        { status: 'suspended' }
      ),
    onReactivate: (host) =>
      runReview(
        host,
        () => reviewHostAction(host.id, 'approved'),
        `Host "${host.displayName}" reactivated successfully.`,
        'Failed to reactivate host',
        { status: 'approved' }
      ),
  };

  const handleConfirmReject = (reason: string) => {
    const host = rejectingHost;
    if (!host) return;
    void runReview(
      host,
      async () => {
        await reviewHostAction(host.id, 'rejected', reason);
        setRejectingHost(null);
      },
      `Application for "${host.displayName}" has been rejected.`,
      'Failed to reject host',
      { status: 'rejected', rejectionReason: reason }
    );
  };

  return (
    <div className="space-y-6">
      <DarkToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={cn(
                'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-[var(--color-brand)] text-white shadow-sm'
                  : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100',
              )}
            >
              {tab.label} ({counts[tab.id]})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            aria-label="Search hosts by name, email, or city"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search host, email, city..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)]"
          />
        </div>
      </div>

      <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider border-b border-[var(--color-border-light)]">
              <tr>
                <th className="px-6 py-3.5">Host Name</th>
                <th className="px-6 py-3.5">Contact Email</th>
                <th className="px-6 py-3.5">Cities</th>
                <th className="px-6 py-3.5">Units Declared</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
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
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
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
                hosts.map((host) => (
                  <HostRow key={host.id} host={host} actions={actions} onOpenDetails={setSelectedHost} />
                ))
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

      {selectedHost && <HostDetailDrawer host={selectedHost} actions={actions} onClose={() => setSelectedHost(null)} />}

      {rejectingHost && (
        <ReasonPromptModal
          ariaLabel={`Reject host application for ${rejectingHost.displayName}`}
          icon={ShieldAlert}
          title="Reject Host Application"
          subtitle={`${rejectingHost.displayName} (${getHostEmail(rejectingHost)})`}
          description="Please specify the reason for rejection. This feedback helps the applicant improve their portfolio or re-apply."
          defaultReason="Portfolio does not meet NomadDesk remote standards"
          isSubmitting={isSubmitting}
          onCancel={() => setRejectingHost(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
}
