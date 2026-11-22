'use client';

import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import Image from 'next/image';
import type { Property } from '@/lib/types';
import { fetchAdminPropertiesAction } from '@/app/admin/admin-actions';
import { reorderFeaturedPropertiesAction } from '@/app/admin/cms-actions';
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  X,
  Building,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FeaturedPropertiesManager() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToAddId, setSelectedToAddId] = useState<number | ''>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isActionRunningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async () => {
    setErrorMessage(null);
    try {
      const { propList } = await fetchAdminPropertiesAction();
      // Filter published only for featured selection
      const published = propList.filter((p) => p.status === 'published');

      // Sort featured by featuredPosition ascending (1-based)
      const featured = [...published]
        .filter((p) => p.featuredPosition != null || p.isFeatured)
        .sort((a, b) => {
          const posA = a.featuredPosition ?? 999;
          const posB = b.featuredPosition ?? 999;
          return posA - posB;
        });

      startTransition(() => {
        setAllProperties(published);
        setFeaturedProperties(featured);
        setLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load featured properties.');
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setErrorMessage(null);
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  // Candidates that can be added to featured (published and not currently featured)
  const availableToAdd = useMemo(() => {
    const featuredIds = new Set(featuredProperties.map((p) => p.id));
    return allProperties.filter((p) => !featuredIds.has(p.id));
  }, [allProperties, featuredProperties]);

  // Save current order to store
  const syncOrder = async (newList: Property[]) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderedIds = newList.map((p) => p.id);
      const res = await reorderFeaturedPropertiesAction(orderedIds);
      startTransition(() => {
        setFeaturedProperties(res.properties);
      });
      showToast('Featured properties and 3D Showcase updated successfully!');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update featured order');
      await fetchData();
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  // Move property up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextList = [...featuredProperties];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    syncOrder(nextList);
  };

  // Move property down
  const handleMoveDown = (index: number) => {
    if (index === featuredProperties.length - 1) return;
    const nextList = [...featuredProperties];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    syncOrder(nextList);
  };

  // Remove from featured
  const handleRemove = (propertyId: number) => {
    const nextList = featuredProperties.filter((p) => p.id !== propertyId);
    syncOrder(nextList);
  };

  // Add new property to featured (appended to end)
  const handleAdd = () => {
    if (!selectedToAddId) return;
    const target = allProperties.find((p) => p.id === Number(selectedToAddId));
    if (!target) return;

    const nextList = [...featuredProperties, target];
    setSelectedToAddId('');
    syncOrder(nextList);
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

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
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

      {/* Explanatory Banner */}
      <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <div className="font-semibold text-[var(--color-text-on-light)]">
            Homepage Featured Grid &amp; 3D Showcase Order
          </div>
          <p className="text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
            These properties appear in the &ldquo;Featured Apartments&rdquo; section of the homepage.
            The <strong>very first property (Rank #1)</strong> is automatically selected for the interactive 3D Stay Showcase.
            Use the Move Up / Move Down buttons to prioritize properties.
          </p>
        </div>
      </div>

      {/* Add to Featured Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-white rounded-xl border border-[var(--color-border-light)] shadow-sm">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="featured-property-select"
            className="block text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-1"
          >
            Add Published Property to Featured List:
          </label>
          <select
            id="featured-property-select"
            value={selectedToAddId}
            onChange={(e) => setSelectedToAddId(e.target.value ? Number(e.target.value) : '')}
            data-testid="select-featured-property"
            className="w-full min-h-10 text-sm py-2 px-3 rounded-lg border border-[var(--color-border-light)] bg-neutral-50 text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="">-- Select a property to feature ({availableToAdd.length} eligible) --</option>
            {availableToAdd.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} · {p.title} ({p.city} - ${Math.round(p.pricePerMonth / 100)}/mo)
              </option>
            ))}
          </select>
        </div>
        <div className="sm:self-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedToAddId || isSubmitting}
            data-testid="add-to-featured-btn"
            className="w-full sm:w-auto min-h-10 px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add to Featured
          </button>
        </div>
      </div>

      {/* Featured Properties List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 bg-white rounded-xl border border-[var(--color-border-light)]">
            <div className="w-5 h-5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading featured order...</span>
          </div>
        ) : featuredProperties.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-[var(--color-border-light)]">
            <Building className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="font-semibold text-[var(--color-text-on-light)]">No properties currently featured</p>
            <p className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
              Select an eligible published property above to add it to the homepage.
            </p>
          </div>
        ) : (
          featuredProperties.map((property, index) => {
            const isFirst = index === 0;
            const isLast = index === featuredProperties.length - 1;
            const monthlyUSD = Math.round(property.pricePerMonth / 100);
            const image = property.images?.[0] || '/seed/property/prop-madrid-1.webp';

            return (
              <div
                key={property.id}
                data-testid={`featured-row-${property.id}`}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all',
                  isFirst
                    ? 'bg-amber-50/50 border-amber-300 shadow-sm'
                    : 'bg-white border-[var(--color-border-light)]',
                )}
              >
                {/* Left: Rank & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    data-testid="featured-rank"
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                      isFirst
                        ? 'bg-[var(--color-brand)] text-white shadow-sm'
                        : 'bg-neutral-100 text-[var(--color-text-on-light)]',
                    )}
                  >
                    #{index + 1}
                  </div>

                  <div className="relative w-16 h-14 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                    <Image
                      src={image}
                      alt={property.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-[var(--color-text-on-light)] truncate">
                        {property.title}
                      </h4>
                      {isFirst && (
                        <span className="inline-flex items-center rounded-full text-[10px] font-bold tracking-wider uppercase py-0.5 px-2 bg-amber-500 text-white">
                          ★ 3D Showcase Hero
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-400" />
                        {property.city}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-[var(--color-text-on-light)]">
                        ${monthlyUSD.toLocaleString()}/mo
                      </span>
                      <span>·</span>
                      <span>{property.bedrooms} BR</span>
                      <span>·</span>
                      <span>ID #{property.id}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions (Move Up, Down, Remove) */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
                  <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={isFirst || isSubmitting}
                      data-testid={`move-up-${property.id}`}
                      aria-label={`Move ${property.title} up`}
                      className="flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-neutral-700 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={isLast || isSubmitting}
                      data-testid={`move-down-${property.id}`}
                      aria-label={`Move ${property.title} down`}
                      className="flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-neutral-700 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(property.id)}
                    disabled={isSubmitting}
                    data-testid={`remove-featured-${property.id}`}
                    aria-label={`Remove ${property.title} from featured`}
                    className="flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove from featured"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
