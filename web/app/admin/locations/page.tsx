'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Link from 'next/link';
import type { Location } from '@/lib/types';
import {
  saveLocationAction,
  deleteLocationAction,
  reorderTopCitiesAction,
  fetchAdminLocationsPaginatedAction,
} from '@/app/admin/cms-actions';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { isSafeImagePath } from '@/lib/validations/media';
import {
  MapPin,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Globe,
  Sparkles,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const CONTINENTS = [
  'All',
  'Europe',
  'North America',
  'South America',
  'Central America',
  'Asia',
];
const PAGE_SIZE = 20;

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [continentFilter, setContinentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit/Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);
  const [latDraft, setLatDraft] = useState('40.4168');
  const [lngDraft, setLngDraft] = useState('-3.7038');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isActionRunningRef = useRef(false);
  const requestIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Debounce search (250ms) and reset page only when trimmed query changes
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 250);
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

  // Close destination modal on Escape key (skip if media picker is open or save is in flight)
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !isMediaPickerOpen && !isActionRunningRef.current) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isMediaPickerOpen]);

  const handleOpenAdd = () => {
    setEditingLocation({
      name: '',
      city: '',
      slug: '',
      country: '',
      countryCode: '',
      continent: 'Europe',
      propertiesCount: 0,
      description: '',
      image: '/seed/location/2241.jpg',
      center: [40.4168, -3.7038],
      isActive: true,
      position: undefined,
    });
    setLatDraft('40.4168');
    setLngDraft('-3.7038');
    setIsMediaPickerOpen(false);
    setFormError(null);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation({ ...loc });
    setLatDraft(String(loc.center?.[0] ?? 40.4168));
    setLngDraft(String(loc.center?.[1] ?? -3.7038));
    setIsMediaPickerOpen(false);
    setFormError(null);
    setActionError(null);
    setIsModalOpen(true);
  };

  const topCitiesOnPage = locations
    .filter((l) => l.position != null && l.position <= 8)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

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
      showToast('Top Cities order updated on homepage.');
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
      showToast(`${loc.name} is now ${nextActive ? 'visible' : 'hidden'} across platform.`);
      const willDropRow =
        (statusFilter === 'active' && !nextActive) || (statusFilter === 'hidden' && nextActive);
      const nextPage = willDropRow && locations.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await fetchLocationsPage(nextPage);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update visibility.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || isSubmitting || isActionRunningRef.current) return;

    if (!editingLocation.name?.trim() || !editingLocation.country?.trim()) {
      setFormError('Please enter city name and country.');
      return;
    }

    const trimmedCountryCode = (editingLocation.countryCode || '').trim().toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(trimmedCountryCode)) {
      setFormError('Please enter a valid 2–3 letter country code (e.g. ES, PT, US).');
      return;
    }

    const parsedLat = Number(latDraft.trim());
    const parsedLng = Number(lngDraft.trim());
    if (
      latDraft.trim() === '' ||
      lngDraft.trim() === '' ||
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setFormError('Please enter valid map coordinates (lat -90..90, lng -180..180).');
      return;
    }

    const trimmedImage = (editingLocation.image || '').trim();
    if (!trimmedImage || !isSafeImagePath(trimmedImage)) {
      setFormError('Cover image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: Partial<Location> = {
        ...editingLocation,
        name: editingLocation.name.trim(),
        country: editingLocation.country.trim(),
        countryCode: trimmedCountryCode,
        image: trimmedImage,
        center: [parsedLat, parsedLng],
        city: editingLocation.city?.trim() || editingLocation.name.trim(),
        slug:
          editingLocation.slug?.trim() ||
          editingLocation.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
      };

      await saveLocationAction(payload);
      showToast(
        editingLocation.id
          ? `Destination ${payload.name} updated successfully!`
          : `Destination ${payload.name} created and live everywhere!`
      );
      setIsModalOpen(false);
      setEditingLocation(null);
      await fetchLocationsPage(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save location.');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this destination?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setFormError(null);

    try {
      await deleteLocationAction(id);
      showToast('Destination deleted.');
      setIsModalOpen(false);
      setEditingLocation(null);
      const nextPage = locations.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await fetchLocationsPage(nextPage);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Cannot delete destination.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
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
            Manage {counts.all} remote work destinations, customize map coordinates, and configure top cities order on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          data-testid="add-city-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Destination</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="p-1 rounded hover:bg-red-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
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
            {/* Continent filter */}
            <select
              aria-label="Filter by continent"
              value={continentFilter}
              onChange={(e) => {
                setContinentFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
            >
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Continents' : c}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'hidden');
                setPage(1);
              }}
              className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Continent</th>
                  <th className="py-3 px-4">Properties</th>
                  <th className="py-3 px-4">Top Cities Order</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {locations.map((loc) => {
                  const isTop = loc.position != null && loc.position <= 8;
                  const isHidden = loc.isActive === false;

                  return (
                    <tr
                      key={loc.id}
                      data-testid={`location-row-${loc.id}`}
                      className={`hover:bg-neutral-50/50 transition-colors ${
                        isHidden ? 'opacity-60 bg-neutral-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-[var(--color-text-on-light)]">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                          <span>{loc.name || loc.city}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-normal pl-5 block">
                          /c/furnished-apartments-{loc.slug}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {loc.country} ({loc.countryCode})
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">{loc.continent}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-800">
                          {loc.propertiesCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isTop ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              #{loc.position}
                            </span>
                            {topCitiesOnPage.length > 1 && (
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={topCitiesOnPage[0]?.id === loc.id}
                                  onClick={() => handleReorderTopCity(loc.id, -1)}
                                  aria-label={`Move ${loc.name || loc.city} up in Top Cities`}
                                  className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={topCitiesOnPage[topCitiesOnPage.length - 1]?.id === loc.id}
                                  onClick={() => handleReorderTopCity(loc.id, 1)}
                                  aria-label={`Move ${loc.name || loc.city} down in Top Cities`}
                                  className="p-1 rounded border border-[var(--color-border-light)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isHidden ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                            Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isHidden && (
                            <Link
                              href={`/c/furnished-apartments-${loc.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on Web"
                              aria-label={`View ${loc.name || loc.city} on web`}
                              data-testid={`view-location-${loc.slug}`}
                              className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(loc)}
                            title={isHidden ? 'Show destination' : 'Hide destination'}
                            aria-label={isHidden ? `Show ${loc.name || loc.city}` : `Hide ${loc.name || loc.city}`}
                            data-testid={`toggle-active-${loc.slug}`}
                            className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(loc)}
                            data-testid={`edit-location-${loc.slug}`}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-medium text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            Edit City
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* Modal: Add / Edit Destination */}
      {isModalOpen && editingLocation && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in ${
            isMediaPickerOpen ? 'hidden' : ''
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingLocation.id ? 'Edit Destination' : 'Add New Destination'}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--color-brand)]" />
                <span>{editingLocation.id ? 'Edit Destination' : 'Add New Destination'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    City Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLocation.name || ''}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({
                        ...prev,
                        name: e.target.value,
                        city: e.target.value,
                      }))
                    }
                    placeholder="e.g. Lisbon"
                    data-testid="location-name-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={editingLocation.slug || ''}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="e.g. lisbon"
                    data-testid="location-slug-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLocation.country || ''}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({ ...prev, country: e.target.value }))
                    }
                    placeholder="e.g. Portugal"
                    data-testid="location-country-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Country Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLocation.countryCode || ''}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g. PT"
                    maxLength={3}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Continent</label>
                  <select
                    value={editingLocation.continent || 'Europe'}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({ ...prev, continent: e.target.value }))
                    }
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  >
                    <option value="Europe">Europe</option>
                    <option value="North America">North America</option>
                    <option value="South America">South America</option>
                    <option value="Central America">Central America</option>
                    <option value="Asia">Asia</option>
                    <option value="Africa">Africa</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Initial Properties Count</label>
                  <input
                    type="number"
                    min={0}
                    value={editingLocation.propertiesCount ?? 0}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({ ...prev, propertiesCount: Number(e.target.value) }))
                    }
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Description</label>
                <TiptapEditor
                  value={editingLocation.description || ''}
                  onChange={(val) =>
                    setEditingLocation((prev) => (prev ? { ...prev, description: val } : null))
                  }
                  label="Destination Description"
                  placeholder="Write a city overview for the destination page and SEO meta..."
                  minHeight="160px"
                  testIdPrefix="location-description-editor"
                />
              </div>

              <ImagePickerField
                id="location-cover-image"
                label="Cover Image"
                value={editingLocation.image || ''}
                onChange={(url) =>
                  setEditingLocation((prev) => (prev ? { ...prev, image: url } : null))
                }
                onModalOpenChange={setIsMediaPickerOpen}
                placeholder="/seed/location/2077.jpg"
                helperText="Choose from the Media Library, upload a new photo, or enter a /uploads/, /seed/, or https:// path."
                testIdPrefix="location-cover-image"
                previewAlt={editingLocation.name || 'Destination cover'}
                modalTitle="Choose Destination Cover Image"
              />

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="location-map-lat" className="block font-semibold text-neutral-700 mb-1">
                    Map Lat
                  </label>
                  <input
                    id="location-map-lat"
                    type="text"
                    inputMode="decimal"
                    value={latDraft}
                    onChange={(e) => setLatDraft(e.target.value)}
                    placeholder="e.g. 38.7223"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label htmlFor="location-map-lng" className="block font-semibold text-neutral-700 mb-1">
                    Map Lng
                  </label>
                  <input
                    id="location-map-lng"
                    type="text"
                    inputMode="decimal"
                    value={lngDraft}
                    onChange={(e) => setLngDraft(e.target.value)}
                    placeholder="e.g. -9.1393"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              </div>

              {/* Visibility and Top City Order */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingLocation.isActive !== false}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    data-testid="location-active-checkbox"
                    className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                  />
                  <span className="font-semibold text-neutral-800">
                    Visible on Platform
                  </span>
                </label>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Top Cities Order (1 to 8, or leave blank to unfeature)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={editingLocation.position && editingLocation.position <= 8 ? editingLocation.position : ''}
                    onChange={(e) => {
                      const val = e.target.value
                        ? Number(e.target.value)
                        : editingLocation.id
                          ? 99
                          : undefined;
                      setEditingLocation((prev) => ({ ...prev, position: val }));
                    }}
                    placeholder="e.g. 8 for #8 in Top Cities"
                    data-testid="location-top-order-input"
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-light)]">
                {editingLocation.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(editingLocation.id!)}
                    disabled={(editingLocation.propertiesCount || 0) > 0}
                    className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                    title={(editingLocation.propertiesCount || 0) > 0 ? 'Cannot delete when properties exist' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--color-border-light)] text-neutral-700 text-xs font-medium hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="save-location-btn"
                    className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Destination'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
