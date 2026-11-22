'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import type { Property, PropertyStatus, HostProfile } from '@/lib/types';
import type { AdminPropertiesStatusCounts } from '@/lib/api/properties';
import {
  fetchAdminPropertiesAction,
  fetchAdminPropertiesPaginatedAction,
  approvePropertyAction,
  updatePropertyStatusAction,
  deletePropertyAction,
} from '@/app/admin/admin-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { CheckCircle, Building, X, AlertTriangle } from 'lucide-react';
import {
  ModerationFilters,
  ModerationTabs,
  type ModerationTab,
} from '@/features/admin/property-moderation/moderation-filters';
import { PropertyRow } from '@/features/admin/property-moderation/property-row';
import { PropertyInspectModal } from '@/features/admin/property-moderation/property-inspect-modal';
import { PropertyRejectModal } from '@/features/admin/property-moderation/property-reject-modal';
import type { ModerationActions } from '@/features/admin/property-moderation/moderation-actions';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const TOAST_DURATION_MS = 4000;

const EMPTY_COUNTS: AdminPropertiesStatusCounts = {
  all: 0,
  published: 0,
  pending_review: 0,
  draft: 0,
  rejected: 0,
  hidden: 0,
};

export function PropertyModerationTable() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [hosts, setHosts] = useState<HostProfile[]>([]);
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [counts, setCounts] = useState<AdminPropertiesStatusCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ModerationTab>('pending_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectingProperty, setRejectingProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isActionRunningRef = useRef(false);

  // Load host & city filter options once on mount
  useEffect(() => {
    let active = true;
    const loadMetadata = async () => {
      try {
        const { propList, hostList } = await fetchAdminPropertiesAction();
        if (!active) return;
        const cities = Array.from(
          new Set(propList.map((p) => p.city).filter((c): c is string => Boolean(c)))
        ).sort();
        startTransition(() => {
          setHosts(hostList);
          setUniqueCities(cities);
        });
      } catch {
        // Non-blocking: filter dropdowns will simply remain empty if metadata fails
      }
    };
    loadMetadata();
    return () => {
      active = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Debounce keyword search and reset page to 1 only when the trimmed query changes
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
        const result = await fetchAdminPropertiesPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          status: activeTab,
          city: cityFilter === 'all' ? undefined : cityFilter,
          hostId: hostFilter === 'all' ? undefined : Number(hostFilter),
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setProperties(result.items);
          setTotal(result.total);
          setCounts(result.counts);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load properties');
          setLoading(false);
        });
      }
    },
    [activeTab, cityFilter, hostFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  useEffect(() => {
    if (errorMessage) {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorMessage]);

  useEffect(() => {
    if (!selectedProperty && !rejectingProperty) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActionRunningRef.current) {
        if (rejectingProperty) setRejectingProperty(null);
        else setSelectedProperty(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProperty, rejectingProperty]);

  const showToast = (msg: string) => {
    setErrorMessage(null);
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  };

  const hostNameById = useMemo(() => new Map(hosts.map((h) => [h.id, h.displayName])), [hosts]);
  const getHostName = (hostId: number) => hostNameById.get(hostId) ?? `Host #${hostId}`;

  const reloadAfterMutation = async () => {
    const nextPage = properties.length <= 1 && page > 1 ? page - 1 : page;
    if (nextPage !== page) setPage(nextPage);
    else await fetchPage(page);
  };

  // Runs one moderation action at a time, then refreshes the page and the open inspect modal
  const runMutation = async (
    property: Property,
    action: () => Promise<unknown>,
    successMessage: string,
    fallbackError: string,
    patchSelected: Partial<Property> | 'close'
  ) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await action();
      showToast(successMessage);
      if (patchSelected === 'close' && selectedProperty?.id === property.id) setSelectedProperty(null);
      await reloadAfterMutation();
      if (patchSelected !== 'close' && selectedProperty?.id === property.id) {
        setSelectedProperty((prev) => (prev ? { ...prev, ...patchSelected } : null));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : fallbackError);
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const publish = (property: Property, message: string, fallbackError: string) =>
    runMutation(property, () => approvePropertyAction(property.id), message, fallbackError, {
      status: 'published' as PropertyStatus,
    });

  const actions: ModerationActions = {
    isSubmitting,
    onInspect: setSelectedProperty,
    // AC-ADMIN-2
    onApprove: (property) =>
      publish(property, `Listing "${property.title}" approved and published to ${property.city}!`, 'Failed to approve property'),
    onStartReject: (property) => {
      setSelectedProperty(null);
      setRejectingProperty(property);
    },
    onHide: (property) =>
      runMutation(
        property,
        () => updatePropertyStatusAction(property.id, 'hidden'),
        `Listing "${property.title}" hidden from public view.`,
        'Failed to hide property',
        { status: 'hidden' }
      ),
    onPublish: (property) =>
      publish(property, `Listing "${property.title}" is now published.`, 'Failed to publish property'),
    onDelete: (property) => {
      if (!confirm(`Are you sure you want to permanently delete "${property.title}"?`)) return;
      void runMutation(
        property,
        () => deletePropertyAction(property.id),
        `Listing "${property.title}" deleted.`,
        'Failed to delete property',
        'close'
      );
    },
  };

  const handleConfirmReject = (reason: string) => {
    const property = rejectingProperty;
    if (!property) return;
    void runMutation(
      property,
      async () => {
        await updatePropertyStatusAction(property.id, 'rejected', reason);
        setRejectingProperty(null);
      },
      `Listing "${property.title}" rejected.`,
      'Failed to reject property',
      { status: 'rejected', rejectionReason: reason }
    );
  };

  const resetToFirstPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
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

      {errorMessage && (
        <div
          ref={errorBannerRef}
          role="alert"
          data-testid="property-action-error"
          className="flex items-start justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ModerationTabs activeTab={activeTab} counts={counts} onChange={resetToFirstPage(setActiveTab)} />

      <ModerationFilters
        cities={uniqueCities}
        hosts={hosts}
        cityFilter={cityFilter}
        hostFilter={hostFilter}
        searchQuery={searchQuery}
        onCityChange={resetToFirstPage(setCityFilter)}
        onHostChange={resetToFirstPage(setHostFilter)}
        onSearchChange={setSearchQuery}
      />

      <div className="bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider border-b border-[var(--color-border-light)]">
              <tr>
                <th className="px-6 py-3.5">Property Title</th>
                <th className="px-6 py-3.5">Host</th>
                <th className="px-6 py-3.5">City</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      <span>Loading property inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                        <Building className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-[var(--color-text-on-light)]">No properties found</p>
                      <p className="text-xs text-[var(--color-text-on-light-muted)]">
                        {searchQuery || cityFilter !== 'all' || hostFilter !== 'all'
                          ? 'Try clearing the search or changing your filters.'
                          : `There are currently no listings in the "${activeTab}" view.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <PropertyRow
                    key={property.id}
                    property={property}
                    hostName={getHostName(property.hostId)}
                    actions={actions}
                  />
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
          itemLabel="properties"
        />
      </div>

      {selectedProperty && (
        <PropertyInspectModal
          property={selectedProperty}
          hostName={getHostName(selectedProperty.hostId)}
          actions={actions}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {rejectingProperty && (
        <PropertyRejectModal
          property={rejectingProperty}
          isSubmitting={isSubmitting}
          onCancel={() => setRejectingProperty(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
}
