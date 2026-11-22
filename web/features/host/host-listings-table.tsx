'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Plus,
  ExternalLink,
  Edit,
  Eye,
  EyeOff,
  Send,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { Property, PropertyStatus } from '@/lib/types';
import { useCurrency } from '@/context/currency-context';
import { normalizeImageSrc } from '@/lib/format';
import {
  ListingStatusBadge,
  BookingModeBadge,
} from '@/features/host/listing-status-badge';

interface HostListingsTableProps {
  initialProperties: Property[];
  hostName: string;
  isReadOnly?: boolean;
  onSubmitForReview: (
    propertyId: number
  ) => Promise<{ success: boolean; error?: string }>;
  onToggleHide: (
    propertyId: number,
    currentStatus: PropertyStatus
  ) => Promise<{ success: boolean; error?: string }>;
}

export function HostListingsTable({
  initialProperties,
  hostName,
  isReadOnly = false,
  onSubmitForReview,
  onToggleHide,
}: HostListingsTableProps) {
  const { formatPrice } = useCurrency();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inFlightIdsRef = useRef<Set<number>>(new Set());

  const allCount = properties.length;
  const publishedCount = properties.filter((p) => p.status === 'published').length;
  const draftCount = properties.filter((p) => p.status === 'draft').length;
  const pendingCount = properties.filter((p) => p.status === 'pending_review').length;
  const rejectedCount = properties.filter((p) => p.status === 'rejected').length;
  const hiddenCount = properties.filter((p) => p.status === 'hidden').length;

  const tabs = [
    { key: 'all', label: `All (${allCount})` },
    { key: 'published', label: `Published (${publishedCount})` },
    { key: 'draft', label: `Draft (${draftCount})` },
    { key: 'pending_review', label: `Pending Review (${pendingCount})` },
    { key: 'rejected', label: `Rejected (${rejectedCount})` },
    { key: 'hidden', label: `Hidden (${hiddenCount})` },
  ];

  const filteredProperties = properties.filter((p) => {
    if (activeTab === 'all') return true;
    return p.status === activeTab;
  });

  const handleSubmitForReview = async (propId: number) => {
    if (isReadOnly || inFlightIdsRef.current.has(propId)) return;
    inFlightIdsRef.current.add(propId);
    setActionLoadingId(propId);
    setActionError(null);
    try {
      const res = await onSubmitForReview(propId);
      if (res.success) {
        startTransition(() => {
          setProperties((prev) =>
            prev.map((p) =>
              p.id === propId
                ? { ...p, status: 'pending_review' as PropertyStatus }
                : p
            )
          );
        });
      } else {
        setActionError(res.error || 'Failed to submit listing for review.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      inFlightIdsRef.current.delete(propId);
      setActionLoadingId(null);
    }
  };

  const handleToggleHide = async (propId: number, currentStatus: PropertyStatus) => {
    if (isReadOnly || inFlightIdsRef.current.has(propId)) return;
    inFlightIdsRef.current.add(propId);
    setActionLoadingId(propId);
    setActionError(null);
    try {
      const res = await onToggleHide(propId, currentStatus);
      if (res.success) {
        const nextStatus: PropertyStatus =
          currentStatus === 'hidden' ? 'published' : 'hidden';
        startTransition(() => {
          setProperties((prev) =>
            prev.map((p) =>
              p.id === propId ? { ...p, status: nextStatus } : p
            )
          );
        });
      } else {
        setActionError(res.error || 'Failed to change listing visibility.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      inFlightIdsRef.current.delete(propId);
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & New Listing CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            My Property Listings
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Portfolio owned by <span className="font-semibold text-neutral-800">{hostName}</span>
          </p>
        </div>
        {!isReadOnly && (
          <Link
            href="/host/listings/new"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-xs sm:text-sm font-bold text-white shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Listing</span>
          </Link>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
        </div>
      )}

      {/* Tabs Filter Bar (always stable) */}
      <div
        role="tablist"
        aria-label="Filter listings by status"
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 border-b border-neutral-200 text-xs font-semibold scrollbar-none"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-bold uppercase tracking-wider text-neutral-600">
              <th className="py-3 px-4">Listing Title</th>
              <th className="py-3 px-4">City</th>
              <th className="py-3 px-4">Monthly Price</th>
              <th className="py-3 px-4">Booking Mode</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredProperties.map((prop) => {
              const coverImg = normalizeImageSrc(
                prop.images?.[0],
                '/seed/property/prop-madrid-1.webp'
              );
              const isLoadingThis = actionLoadingId === prop.id;

              return (
                <tr
                  key={prop.id}
                  className="hover:bg-neutral-50/60 transition-colors"
                >
                  <td className="py-3.5 px-4 max-w-md">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-9 rounded overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200">
                        <Image
                          src={coverImg}
                          alt={prop.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-neutral-900 truncate">
                          {prop.title}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {prop.neighborhood ? `${prop.neighborhood} • ` : ''}
                          {prop.bedrooms} BR • {prop.totalSurface} m²
                        </div>
                        {prop.status === 'rejected' && prop.rejectionReason && (
                          <div className="mt-1 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                            <Info className="w-3 h-3 shrink-0" />
                            <span>Reason: {prop.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-neutral-700">
                    {prop.city}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-neutral-900">
                    {formatPrice(prop.pricePerMonth)}
                  </td>
                  <td className="py-3.5 px-4">
                    <BookingModeBadge isDirectBooking={prop.isDirectBooking} />
                  </td>
                  <td className="py-3.5 px-4">
                    <ListingStatusBadge status={prop.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/host/listings/${prop.id}/edit`}
                        className="px-2.5 py-1 rounded text-xs font-semibold border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        {isReadOnly ? 'Inspect' : 'Edit'}
                      </Link>

                      {prop.status === 'published' ? (
                        <Link
                          href={`/l/apartments/${prop.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded text-xs font-semibold border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Link>
                      ) : (
                        <span
                          title="Property is not publicly visible until published"
                          className="px-2.5 py-1 rounded text-xs font-medium border border-neutral-200 text-neutral-400 cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </span>
                      )}

                      {(prop.status === 'draft' || prop.status === 'rejected') && (
                        <button
                          type="button"
                          disabled={isReadOnly || isLoadingThis}
                          onClick={() => handleSubmitForReview(prop.id)}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Submit
                        </button>
                      )}

                      {prop.status === 'published' && (
                        <button
                          type="button"
                          disabled={isReadOnly || isLoadingThis}
                          onClick={() => handleToggleHide(prop.id, 'published')}
                          title="Hide from public search"
                          aria-label={`Hide ${prop.title} from public search`}
                          className="px-2 py-1 rounded text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {prop.status === 'hidden' && (
                        <button
                          type="button"
                          disabled={isReadOnly || isLoadingThis}
                          onClick={() => handleToggleHide(prop.id, 'hidden')}
                          title="Unhide and publish"
                          aria-label={`Unhide ${prop.title} and restore to public search`}
                          className="px-2 py-1 rounded text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (< 768px) */}
      <div className="md:hidden space-y-3">
        {filteredProperties.map((prop) => {
          const coverImg = normalizeImageSrc(
            prop.images?.[0],
            '/seed/property/prop-madrid-1.webp'
          );
          const isLoadingThis = actionLoadingId === prop.id;

          return (
            <div
              key={prop.id}
              className="bg-white border border-[var(--color-border-light)] rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex gap-3">
                <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200">
                  <Image
                    src={coverImg}
                    alt={prop.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-2">
                    {prop.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {prop.city} • {prop.bedrooms} BR • {prop.totalSurface} m²
                  </div>
                </div>
              </div>

              {prop.status === 'rejected' && prop.rejectionReason && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Reason: {prop.rejectionReason}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                <div className="font-bold text-neutral-900 text-sm">
                  {formatPrice(prop.pricePerMonth)}
                  <span className="text-xs font-normal text-neutral-500">/mo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookingModeBadge isDirectBooking={prop.isDirectBooking} />
                  <ListingStatusBadge status={prop.status} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={`/host/listings/${prop.id}/edit`}
                  className="flex-1 min-h-10 inline-flex items-center justify-center rounded-lg text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                >
                  {isReadOnly ? 'Inspect' : 'Edit'}
                </Link>

                {prop.status === 'published' ? (
                  <Link
                    href={`/l/apartments/${prop.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-10 inline-flex items-center justify-center rounded-lg text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  >
                    View
                  </Link>
                ) : (
                  <span className="flex-1 min-h-10 inline-flex items-center justify-center rounded-lg text-xs font-medium border border-neutral-200 text-neutral-400 cursor-not-allowed">
                    View
                  </span>
                )}

                {(prop.status === 'draft' || prop.status === 'rejected') && (
                  <button
                    type="button"
                    disabled={isReadOnly || isLoadingThis}
                    onClick={() => handleSubmitForReview(prop.id)}
                    className="flex-1 min-h-10 inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
                  >
                    Submit
                  </button>
                )}

                {prop.status === 'published' && (
                  <button
                    type="button"
                    disabled={isReadOnly || isLoadingThis}
                    onClick={() => handleToggleHide(prop.id, 'published')}
                    aria-label={`Hide ${prop.title} from public search`}
                    className="min-h-10 px-3 inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </button>
                )}

                {prop.status === 'hidden' && (
                  <button
                    type="button"
                    disabled={isReadOnly || isLoadingThis}
                    onClick={() => handleToggleHide(prop.id, 'hidden')}
                    aria-label={`Unhide ${prop.title} and restore to public search`}
                    className="min-h-10 px-3 inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Unhide</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">
            No properties found
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
            {activeTab === 'all'
              ? 'You have not added any apartment listings to your portfolio yet.'
              : `There are currently no listings in the "${activeTab.replace('_', ' ')}" status category.`}
          </p>
          {!isReadOnly && (
            <div className="pt-2">
              <Link
                href="/host/listings/new"
                className="inline-flex min-h-10 items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-xs font-bold text-white shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Listing</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
