'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import type { Location } from '@/lib/types';
import {
  saveLocationAction,
  deleteLocationAction,
  reorderTopCitiesAction,
  fetchAdminLocationsPaginatedAction,
} from '@/app/admin/cms-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { Search, Plus, Globe } from 'lucide-react';
import {
  DismissibleError,
  FILTER_SELECT_CLASS,
  SuccessToast,
  useToastMessage,
} from '@/features/admin/content/content-list-parts';
import { LocationEditModal, buildNewLocationDraft } from '@/features/admin/locations/location-edit-modal';
import { LocationsTable, isTopCity } from '@/features/admin/locations/locations-table';

const CONTINENTS = ['All', 'Europe', 'North America', 'South America', 'Central America', 'Asia'];
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

type StatusFilter = 'all' | 'active' | 'hidden';

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [continentFilter, setContinentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);
  const toast = useToastMessage();

  const isActionRunningRef = useRef(false);
  const requestIdRef = useRef(0);

  // Debounce search and reset page only when trimmed query changes
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const fetchLocationsPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setActionError(null);
      try {
        const res = await fetchAdminLocationsPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          continent: continentFilter !== 'All' ? continentFilter : undefined,
          status: statusFilter === 'hidden' ? 'inactive' : statusFilter,
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setLocations(res.items);
          setTotal(res.total);
          setCounts(res.counts);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setActionError(err instanceof Error ? err.message : 'Failed to load destinations.');
          setLoading(false);
        });
      }
    },
    [continentFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchLocationsPage(page);
  }, [fetchLocationsPage, page]);

  // Re-fetch, stepping back a page when the only row on it just disappeared
  const reloadAfterRemoval = async (rowRemoved: boolean) => {
    const nextPage = rowRemoved && locations.length === 1 && page > 1 ? page - 1 : page;
    if (nextPage !== page) setPage(nextPage);
    else await fetchLocationsPage(nextPage);
  };

  const topCitiesOnPage = locations.filter(isTopCity).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  const handleOpenEdit = (loc: Partial<Location>) => {
    setActionError(null);
    setEditingLocation(loc);
  };

  const closeModal = useCallback(() => setEditingLocation(null), []);

  const handleReorderTopCity = async (locId: number, direction: -1 | 1) => {
    if (isActionRunningRef.current) return;
    const idx = topCitiesOnPage.findIndex((l) => l.id === locId);
    const nextIdx = idx + direction;
    if (idx < 0 || nextIdx < 0 || nextIdx >= topCitiesOnPage.length) return;

    isActionRunningRef.current = true;
    setActionError(null);
    try {
      const reordered = [...topCitiesOnPage];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(nextIdx, 0, moved);
      await reorderTopCitiesAction(reordered.map((l) => l.id));
      toast.show('Top Cities order updated on homepage.');
      await fetchLocationsPage(page);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder Top Cities.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleToggleActive = async (loc: Location) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);
    try {
      const nextActive = loc.isActive === false;
      await saveLocationAction({ id: loc.id, isActive: nextActive });
      toast.show(`${loc.name} is now ${nextActive ? 'visible' : 'hidden'} across platform.`);
      const willDropRow = (statusFilter === 'active' && !nextActive) || (statusFilter === 'hidden' && nextActive);
      await reloadAfterRemoval(willDropRow);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update visibility.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleSaved = async (message: string) => {
    toast.show(message);
    setEditingLocation(null);
    await fetchLocationsPage(page);
  };

  const handleDelete = async (id: number) => {
    await deleteLocationAction(id);
    toast.show('Destination deleted.');
    setEditingLocation(null);
    await reloadAfterRemoval(true);
  };

  return (
    <div className="space-y-6">
      <SuccessToast message={toast.message} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-[var(--color-text-on-light)] font-medium">Content Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            Destinations &amp; Top Cities Management
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
            Manage {counts.all} remote work destinations, customize map coordinates, and configure top cities order on the
            homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenEdit(buildNewLocationDraft())}
          data-testid="add-city-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Destination</span>
        </button>
      </div>

      <DismissibleError message={actionError} onDismiss={() => setActionError(null)} />

      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Filter destinations by city, country, or slug"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by city, country, or slug..."
              data-testid="city-search-input"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by continent"
              value={continentFilter}
              onChange={(e) => {
                setContinentFilter(e.target.value);
                setPage(1);
              }}
              className={FILTER_SELECT_CLASS}
            >
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Continents' : c}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className={FILTER_SELECT_CLASS}
            >
              <option value="all">All Status ({counts.all})</option>
              <option value="active">Visible Only ({counts.active})</option>
              <option value="hidden">Hidden Only ({counts.inactive})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Destinations Data Table */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading destinations...</div>
        ) : locations.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-neutral-700">No destinations found</div>
            <p className="text-xs text-neutral-400 mt-1">Try adjusting your search or continent filter.</p>
          </div>
        ) : (
          <LocationsTable
            locations={locations}
            topCities={topCitiesOnPage}
            onReorderTopCity={handleReorderTopCity}
            onToggleActive={handleToggleActive}
            onEdit={(loc) => handleOpenEdit({ ...loc })}
          />
        )}

        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={loading}
          itemLabel="destinations"
        />
      </div>

      {editingLocation && (
        <LocationEditModal
          initial={editingLocation}
          onClose={closeModal}
          onSaved={handleSaved}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
