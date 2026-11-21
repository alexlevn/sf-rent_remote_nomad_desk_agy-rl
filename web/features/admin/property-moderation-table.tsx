'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Property, PropertyStatus, HostProfile } from '@/lib/types';
import {
  fetchAdminPropertiesAction,
  approvePropertyAction,
  updatePropertyStatusAction,
  deletePropertyAction,
} from '@/app/admin/admin-actions';
import {
  Search,
  CheckCircle,
  Edit,
  Trash2,
  ExternalLink,
  Building,
  Wifi,
  MapPin,
  X,
  AlertTriangle,
  Monitor,
} from 'lucide-react';

type ModerationTab = 'pending_review' | 'published' | 'hidden_or_other' | 'all';

export function PropertyModerationTable() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [hosts, setHosts] = useState<HostProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModerationTab>('pending_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectingProperty, setRejectingProperty] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Listing requires higher quality workstation photos');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isActionRunningRef = useRef(false);

  const fetchData = async () => {
    try {
      const { propList, hostList } = await fetchAdminPropertiesAction();
      startTransition(() => {
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

  // Find host display name
  const getHostName = useCallback((hostId: number) => {
    const host = hosts.find((h) => h.id === hostId);
    return host ? host.displayName : `Host #${hostId}`;
  }, [hosts]);

  // Unique cities from properties
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set).sort();
  }, [properties]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      pending: properties.filter((p) => p.status === 'pending_review').length,
      published: properties.filter((p) => p.status === 'published').length,
      hidden: properties.filter((p) => ['hidden', 'draft', 'rejected'].includes(p.status)).length,
      all: properties.length,
    };
  }, [properties]);

  // Approve action (AC-ADMIN-2)
  const handleApprove = async (property: Property) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);

    try {
      await approvePropertyAction(property.id);
      showToast(`Listing "${property.title}" approved and published to ${property.city}!`);
      await fetchData();
      if (selectedProperty?.id === property.id) {
        setSelectedProperty((prev) => (prev ? { ...prev, status: 'published' } : null));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve property');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Reject action
  const handleConfirmReject = async () => {
    if (!rejectingProperty || isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);

    try {
      await updatePropertyStatusAction(rejectingProperty.id, 'rejected', rejectionReason);
      showToast(`Listing "${rejectingProperty.title}" rejected.`);
      const propId = rejectingProperty.id;
      setRejectingProperty(null);
      await fetchData();
      if (selectedProperty?.id === propId) {
        setSelectedProperty((prev) => (prev ? { ...prev, status: 'rejected', rejectionReason } : null));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject property');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Hide property action
  const handleHide = async (property: Property) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);

    try {
      await updatePropertyStatusAction(property.id, 'hidden');
      showToast(`Listing "${property.title}" hidden from public view.`);
      await fetchData();
      if (selectedProperty?.id === property.id) {
        setSelectedProperty((prev) => (prev ? { ...prev, status: 'hidden' } : null));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to hide property');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Unhide / republish
  const handlePublish = async (property: Property) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);

    try {
      await approvePropertyAction(property.id);
      showToast(`Listing "${property.title}" is now published.`);
      await fetchData();
      if (selectedProperty?.id === property.id) {
        setSelectedProperty((prev) => (prev ? { ...prev, status: 'published' } : null));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish property');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Delete property action
  const handleDelete = async (property: Property) => {
    if (!confirm(`Are you sure you want to permanently delete "${property.title}"?`)) {
      return;
    }
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);

    try {
      await deletePropertyAction(property.id);
      showToast(`Listing "${property.title}" deleted.`);
      if (selectedProperty?.id === property.id) {
        setSelectedProperty(null);
      }
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete property');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Tab filter
      if (activeTab === 'pending_review' && p.status !== 'pending_review') return false;
      if (activeTab === 'published' && p.status !== 'published') return false;
      if (
        activeTab === 'hidden_or_other' &&
        !['hidden', 'draft', 'rejected'].includes(p.status)
      ) {
        return false;
      }

      // City filter
      if (cityFilter !== 'all' && p.city.toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      // Host filter
      if (hostFilter !== 'all' && String(p.hostId) !== hostFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hostName = getHostName(p.hostId).toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          (p.neighborhood && p.neighborhood.toLowerCase().includes(q)) ||
          hostName.includes(q)
        );
      }

      return true;
    });
  }, [properties, activeTab, cityFilter, hostFilter, searchQuery, getHostName]);

  const renderStatusBadge = (status: PropertyStatus) => {
    switch (status) {
      case 'published':
        return <span className="badge badge-success">Published</span>;
      case 'pending_review':
        return <span className="badge badge-warning">Pending Review</span>;
      case 'hidden':
        return <span className="badge badge-neutral bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200">Hidden</span>;
      case 'draft':
        return <span className="badge bg-neutral-100 text-neutral-600 border border-neutral-300">Draft</span>;
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
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] pb-4">
        <button
          onClick={() => setActiveTab('pending_review')}
          className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'pending_review'
              ? 'bg-[var(--color-brand)] text-white shadow-sm'
              : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Pending Review ({counts.pending})
        </button>
        <button
          onClick={() => setActiveTab('published')}
          className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'published'
              ? 'bg-[var(--color-brand)] text-white shadow-sm'
              : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Published ({counts.published})
        </button>
        <button
          onClick={() => setActiveTab('hidden_or_other')}
          className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'hidden_or_other'
              ? 'bg-[var(--color-brand)] text-white shadow-sm'
              : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Draft / Hidden / Rejected ({counts.hidden})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-[var(--color-brand)] text-white shadow-sm'
              : 'text-[var(--color-text-on-light-muted)] hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          All Listings ({counts.all})
        </button>
      </div>

      {/* Filter Controls (City, Host, Search) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        {/* City Filter */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1">
            Filter by City
          </label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="all">All Cities ({uniqueCities.length})</option>
            {uniqueCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Host Filter */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1">
            Filter by Host
          </label>
          <select
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value)}
            className="w-full text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="all">All Hosts ({hosts.length})</option>
            {hosts.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Keyword Search */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1">
            Search Listings
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Title, ND-PROP, neighborhood..."
              className="w-full text-sm py-2 pl-9 pr-3 rounded-lg border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-white dark:bg-neutral-800 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="data-table-container bg-white dark:bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <tr>
                <th className="px-6 py-3.5">Property Title</th>
                <th className="px-6 py-3.5">Host</th>
                <th className="px-6 py-3.5">City</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      <span>Loading property inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
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
                filteredProperties.map((property) => {
                  const monthlyUSD = Math.round(property.pricePerMonth / 100);
                  const firstImage = property.images?.[0] || '/seed/property/prop-madrid-1.webp';

                  return (
                    <tr
                      key={property.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Title & Preview */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex items-start gap-3">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                            <Image
                              src={firstImage}
                              alt={property.title}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelectedProperty(property)}
                              className="font-semibold text-[var(--color-text-on-light)] hover:text-[var(--color-brand)] text-left line-clamp-1"
                            >
                              {property.title}
                            </button>
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                              <span>{property.reference}</span>
                              <span>·</span>
                              <span>{property.bedrooms} BR</span>
                              <span>·</span>
                              <span>{property.totalSurface} m²</span>
                              {property.workstation?.wifiSpeed && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                                    <Wifi className="w-3 h-3" />
                                    {property.workstation.wifiSpeed} Mbps
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Host */}
                      <td className="px-6 py-4 text-[var(--color-text-on-light-muted)] whitespace-nowrap">
                        <div className="font-medium text-[var(--color-text-on-light)]">
                          {getHostName(property.hostId)}
                        </div>
                        <div className="text-xs text-neutral-400">Host #{property.hostId}</div>
                      </td>

                      {/* City */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[var(--color-text-on-light)]">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{property.city}</span>
                        </div>
                        {property.neighborhood && (
                          <div className="text-xs text-[var(--color-text-on-light-muted)] pl-4">
                            {property.neighborhood}
                          </div>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 font-bold text-[var(--color-text-on-light)] whitespace-nowrap">
                        ${monthlyUSD.toLocaleString()}
                        <span className="text-xs font-normal text-neutral-400">/mo</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(property.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Inspect */}
                          <button
                            onClick={() => setSelectedProperty(property)}
                            className="btn btn-outline btn-sm text-xs px-2.5 py-1"
                            title="Inspect listing details"
                          >
                            Inspect
                          </button>

                          {/* Moderation Actions */}
                          {property.status === 'pending_review' && (
                            <>
                              <button
                                onClick={() => handleApprove(property)}
                                disabled={isSubmitting}
                                className="btn btn-primary btn-sm text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingProperty(property);
                                  setRejectionReason('Listing requires higher quality workstation photos');
                                }}
                                disabled={isSubmitting}
                                className="btn btn-outline btn-sm text-xs px-2.5 py-1 text-red-600 border-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {property.status === 'published' && (
                            <>
                              <Link
                                href={`/l/apartments/${property.slug}`}
                                target="_blank"
                                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100"
                                title="View public page"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleHide(property)}
                                disabled={isSubmitting}
                                className="btn btn-outline btn-sm text-xs px-2.5 py-1 text-amber-600 border-amber-200"
                                title="Hide listing from public search"
                              >
                                Hide
                              </button>
                            </>
                          )}

                          {property.status === 'hidden' && (
                            <button
                              onClick={() => handlePublish(property)}
                              disabled={isSubmitting}
                              className="btn btn-primary btn-sm text-xs px-2.5 py-1"
                              title="Publish listing"
                            >
                              Publish
                            </button>
                          )}

                          {/* Edit / Delete */}
                          <Link
                            href={`/host/listings/${property.id}/edit`}
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100"
                            title="Edit listing details"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDelete(property)}
                            disabled={isSubmitting}
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50"
                            title="Delete listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal: Property Detail Inspection */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[var(--color-bg-dark)] max-h-[90vh] rounded-2xl shadow-2xl p-6 overflow-y-auto border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {renderStatusBadge(selectedProperty.status)}
                  <span className="text-xs text-neutral-400">{selectedProperty.reference}</span>
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-on-light)]">
                  {selectedProperty.title}
                </h3>
                <div className="text-sm text-[var(--color-text-on-light-muted)]">
                  {selectedProperty.neighborhood}, {selectedProperty.city}, {selectedProperty.country} · Host: {getHostName(selectedProperty.hostId)}
                </div>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photos Strip */}
            {selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedProperty.images.slice(0, 3).map((img, idx) => (
                  <div key={idx} className="relative h-28 rounded-lg overflow-hidden bg-neutral-100">
                    <Image
                      src={img}
                      alt={`Photo ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Workstation Specification Highlight */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-text-on-light)]">
                <Monitor className="w-4 h-4 text-[var(--color-brand)]" />
                <span>Verified Remote Workstation Specs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 block">Desk:</span>
                  <strong className="text-[var(--color-text-on-light)]">{selectedProperty.workstation?.desk || 'Standard'}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">Chair:</span>
                  <strong className="text-[var(--color-text-on-light)]">{selectedProperty.workstation?.chair || 'Standard'}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">Monitor:</span>
                  <strong className="text-[var(--color-text-on-light)]">{selectedProperty.workstation?.monitors || 'Single Screen'}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">Verified Wi-Fi:</span>
                  <strong className="text-emerald-600">{selectedProperty.workstation?.wifiSpeed || 200} Mbps</strong>
                </div>
              </div>
            </div>

            {/* Property Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-center text-xs">
              <div>
                <span className="text-neutral-400 block">Monthly Rent</span>
                <span className="font-bold text-sm text-[var(--color-text-on-light)]">
                  ${Math.round(selectedProperty.pricePerMonth / 100).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Bedrooms / Baths</span>
                <span className="font-bold text-sm text-[var(--color-text-on-light)]">
                  {selectedProperty.bedrooms} BR / {selectedProperty.bathrooms} BA
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Total Surface</span>
                <span className="font-bold text-sm text-[var(--color-text-on-light)]">
                  {selectedProperty.totalSurface} m²
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Booking Type</span>
                <span className="font-bold text-sm text-[var(--color-brand)]">
                  {selectedProperty.isDirectBooking ? 'Instant Book' : 'Request to Book'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="text-sm space-y-1">
              <span className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-on-light-muted)]">
                Description
              </span>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-xs">
                {selectedProperty.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Rejection Notice if any */}
            {selectedProperty.rejectionReason && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-800 dark:text-red-300 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Rejection Reason:
                </div>
                <p>{selectedProperty.rejectionReason}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
              <div>
                <Link
                  href={`/host/listings/${selectedProperty.id}/edit`}
                  className="btn btn-outline btn-sm text-xs inline-flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Full Form
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="btn btn-outline btn-sm text-xs"
                >
                  Close
                </button>

                {selectedProperty.status === 'pending_review' && (
                  <>
                    <button
                      onClick={() => {
                        setRejectingProperty(selectedProperty);
                        setRejectionReason('Listing requires higher quality workstation photos');
                      }}
                      disabled={isSubmitting}
                      className="btn btn-outline btn-sm text-xs text-red-600 border-red-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedProperty)}
                      disabled={isSubmitting}
                      className="btn btn-primary btn-sm text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Approve & Publish
                    </button>
                  </>
                )}

                {selectedProperty.status === 'published' && (
                  <button
                    onClick={() => handleHide(selectedProperty)}
                    disabled={isSubmitting}
                    className="btn btn-outline btn-sm text-xs text-amber-600 border-amber-200"
                  >
                    Hide Listing
                  </button>
                )}

                {selectedProperty.status === 'hidden' && (
                  <button
                    onClick={() => handlePublish(selectedProperty)}
                    disabled={isSubmitting}
                    className="btn btn-primary btn-sm text-xs"
                  >
                    Republish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {rejectingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[var(--color-bg-dark-surface)] rounded-2xl p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[var(--color-text-on-light)]">
                  Reject Property Listing
                </h4>
                <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-1">
                  {rejectingProperty.title}
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Please state why this listing is being rejected so the Host can correct the listing details.
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
                onClick={() => setRejectingProperty(null)}
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
