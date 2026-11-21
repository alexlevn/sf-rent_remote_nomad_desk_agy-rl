'use client';

import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import type { Location } from '@/lib/types';
import { listLocations } from '@/lib/api/locations';
import {
  saveLocationAction,
  deleteLocationAction,
} from '@/app/admin/cms-actions';
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
} from 'lucide-react';

const CONTINENTS = [
  'All',
  'Europe',
  'North America',
  'South America',
  'Central America',
  'Asia',
];

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [continentFilter, setContinentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit/Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isActionRunningRef = useRef(false);

  const fetchLocations = async () => {
    try {
      const data = await listLocations({ includeInactive: true });
      startTransition(() => {
        setLocations(data);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered destinations
  const filteredLocations = useMemo(() => {
    let result = [...locations];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.slug.toLowerCase().includes(q)
      );
    }

    if (continentFilter !== 'All') {
      result = result.filter((l) => l.continent === continentFilter);
    }

    if (statusFilter === 'active') {
      result = result.filter((l) => l.isActive !== false);
    } else if (statusFilter === 'hidden') {
      result = result.filter((l) => l.isActive === false);
    }

    // Sort: top cities first (position <= 8), then by name
    return result.sort((a, b) => {
      const posA = a.position != null && a.position <= 8 ? a.position : 999;
      const posB = b.position != null && b.position <= 8 ? b.position : 999;
      if (posA !== posB) return posA - posB;
      return a.name.localeCompare(b.name);
    });
  }, [locations, search, continentFilter, statusFilter]);

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
      image: '/seed/location/placeholder.jpg',
      center: [40.4168, -3.7038],
      isActive: true,
      position: undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation({ ...loc });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (loc: Location) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    try {
      const nextActive = loc.isActive === false;
      await saveLocationAction({ id: loc.id, isActive: nextActive });
      showToast(`${loc.name} is now ${nextActive ? 'visible' : 'hidden'} across platform.`);
      await fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || isSubmitting || isActionRunningRef.current) return;

    if (!editingLocation.name || !editingLocation.country) {
      setFormError('Please enter city name and country.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: Partial<Location> = {
        ...editingLocation,
        city: editingLocation.city || editingLocation.name,
        slug:
          editingLocation.slug ||
          editingLocation.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };

      await saveLocationAction(payload);
      showToast(
        editingLocation.id
          ? `Destination ${payload.name} updated successfully!`
          : `Destination ${payload.name} created and live everywhere (AC-CMS-1)!`
      );
      setIsModalOpen(false);
      setEditingLocation(null);
      await fetchLocations();
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

    try {
      await deleteLocationAction(id);
      showToast('Destination deleted.');
      setIsModalOpen(false);
      setEditingLocation(null);
      await fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cannot delete destination');
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
            Manage 34 remote work destinations, customize map coordinates, and configure top cities order on the homepage.
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

      {/* Filters Bar */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
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
              value={continentFilter}
              onChange={(e) => setContinentFilter(e.target.value)}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'hidden')}
              className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Visible Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Destinations Data Table */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading destinations...</div>
        ) : filteredLocations.length === 0 ? (
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
                {filteredLocations.map((loc) => {
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            #{loc.position}
                          </span>
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
                          <button
                            type="button"
                            onClick={() => handleToggleActive(loc)}
                            title={isHidden ? 'Show destination' : 'Hide destination'}
                            className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(loc)}
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
      </div>

      {/* Modal: Add / Edit Destination */}
      {isModalOpen && editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--color-brand)]" />
                <span>{editingLocation.id ? 'Edit Destination' : 'Add New Destination'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                  <label className="block font-semibold text-neutral-700 mb-1">Country Code</label>
                  <input
                    type="text"
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
                <textarea
                  rows={2}
                  value={editingLocation.description || ''}
                  onChange={(e) =>
                    setEditingLocation((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Short summary for city card and meta..."
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={editingLocation.image || ''}
                  onChange={(e) =>
                    setEditingLocation((prev) => ({ ...prev, image: e.target.value }))
                  }
                  placeholder="/seed/location/2077.jpg"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] font-mono text-[11px]"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Map Lat</label>
                  <input
                    type="number"
                    step="any"
                    value={editingLocation.center?.[0] ?? 38.7223}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({
                        ...prev,
                        center: [Number(e.target.value), prev?.center?.[1] ?? -9.1393],
                      }))
                    }
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Map Lng</label>
                  <input
                    type="number"
                    step="any"
                    value={editingLocation.center?.[1] ?? -9.1393}
                    onChange={(e) =>
                      setEditingLocation((prev) => ({
                        ...prev,
                        center: [prev?.center?.[0] ?? 38.7223, Number(e.target.value)],
                      }))
                    }
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
                    Visible on Platform (AC-CMS-1)
                  </span>
                </label>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Top Cities Order (1 to 8, or leave blank)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={editingLocation.position && editingLocation.position <= 8 ? editingLocation.position : ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
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
                ) : <div />}

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
