'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Link from 'next/link';
import type { TravelGuide, Location } from '@/lib/types';
import {
  saveTravelGuideAction,
  deleteTravelGuideAction,
  fetchAdminGuidesPaginatedAction,
  fetchLocationsAction,
} from '@/app/admin/cms-actions';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { useUnsavedChanges } from '@/features/media/use-unsaved-changes';
import { isSafeImagePath } from '@/lib/validations/media';
import {
  BookOpen,
  FileText,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
  ArrowLeft,
  Sparkles,
  X,
  Clock,
  Save,
  Loader2,
} from 'lucide-react';

const CATEGORIES = ['Activities', 'Coworking', 'Neighborhoods', 'Cost of Living', 'City Guide'];
const PAGE_SIZE = 20;

function formatLastSaved(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)} UTC`;
}

function serializeGuideSnapshot(guide: Partial<TravelGuide> | null): string {
  if (!guide) return '';
  return JSON.stringify({
    title: guide.title ?? '',
    slug: guide.slug ?? '',
    city: guide.city ?? '',
    category: guide.category ?? '',
    publishDate: guide.publishDate ?? '',
    featured: Boolean(guide.featured),
    image: guide.image ?? '',
    excerpt: guide.excerpt ?? '',
    content: guide.content ?? '',
    seoTitle: guide.seoTitle ?? '',
    seoDescription: guide.seoDescription ?? '',
    status: guide.status ?? 'published',
  });
}

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<TravelGuide[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Editor mode state
  const [isEditing, setIsEditing] = useState(false);
  const [currentGuide, setCurrentGuide] = useState<Partial<TravelGuide> | null>(null);
  const [persistedGuide, setPersistedGuide] = useState<TravelGuide | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>('');
  const [lastSavedById, setLastSavedById] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDirty = isEditing && serializeGuideSnapshot(currentGuide) !== baselineSnapshot;
  const { confirmLeave } = useUnsavedChanges(isDirty);

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

  // Load locations once for filter and editor city dropdown
  useEffect(() => {
    let active = true;
    fetchLocationsAction()
      .then((locsData) => {
        if (!active) return;
        startTransition(() => {
          setLocations(locsData);
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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

  const fetchGuidesPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetchAdminGuidesPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          city: cityFilter !== 'all' ? cityFilter : undefined,
          status: statusFilter,
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setGuides(res.items);
          setTotal(res.total);
          setCounts(res.counts);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setActionError(err instanceof Error ? err.message : 'Failed to load travel guides.');
          setLoading(false);
        });
      }
    },
    [cityFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchGuidesPage(page);
  }, [fetchGuidesPage, page]);

  const handleOpenNew = () => {
    const draft: Partial<TravelGuide> = {
      title: '',
      slug: '',
      city: locations[0]?.city || 'Barcelona',
      category: 'Activities',
      publishDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      featured: false,
      image: '/seed/guide/placeholder.webp',
      excerpt: '',
      seoTitle: '',
      seoDescription: '',
      content: '<h2>Neighborhood Overview</h2><p>Start writing your guide content here...</p>',
      status: 'published',
    };
    setCurrentGuide(draft);
    setPersistedGuide(null);
    setBaselineSnapshot(serializeGuideSnapshot(draft));
    setFormError(null);
    setActionError(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (guide: TravelGuide) => {
    // Preserve seed content exactly (AC-CMS-3)
    const editable = { ...guide };
    setCurrentGuide(editable);
    setPersistedGuide(guide);
    setBaselineSnapshot(serializeGuideSnapshot(editable));
    setFormError(null);
    setActionError(null);
    setIsEditing(true);
  };

  const handleBackToList = () => {
    // Prevent abandoning the editor while a save request is still in flight
    if (isActionRunningRef.current) return;
    if (!confirmLeave()) return;
    setIsEditing(false);
    setCurrentGuide(null);
    setPersistedGuide(null);
    setBaselineSnapshot('');
    setFormError(null);
  };

  const handleSave = async (intentStatus?: 'published' | 'draft') => {
    if (!currentGuide || isSubmitting || isActionRunningRef.current) return;

    if (!currentGuide.title?.trim()) {
      setFormError('Please enter an article title.');
      return;
    }

    const trimmedImage = (currentGuide.image ?? '').trim();
    if (!trimmedImage || !isSafeImagePath(trimmedImage)) {
      setFormError('Cover image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalStatus = intentStatus || currentGuide.status || 'published';
      const payload: Partial<TravelGuide> = {
        ...currentGuide,
        image: trimmedImage,
        status: finalStatus,
        seoTitle: currentGuide.seoTitle?.trim() || '',
        seoDescription: currentGuide.seoDescription?.trim() || '',
        slug:
          currentGuide.slug?.trim() ||
          currentGuide.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
      };

      const isNew = !currentGuide.id;
      const result = await saveTravelGuideAction(payload);
      if (result?.guide?.id) {
        const savedAt = new Date().toISOString();
        setLastSavedById((prev) => ({ ...prev, [result.guide.id]: savedAt }));
      }
      showToast(
        isNew
          ? finalStatus === 'draft'
            ? `Travel Guide "${payload.title}" saved as draft!`
            : `Travel Guide "${payload.title}" published to /travel-guide (AC-CMS-3)!`
          : `Travel Guide "${payload.title}" updated successfully (AC-CMS-3)!`
      );
      setBaselineSnapshot('');
      setIsEditing(false);
      setCurrentGuide(null);
      setPersistedGuide(null);
      if (isNew && page !== 1) {
        setPage(1);
      } else {
        await fetchGuidesPage(page);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save travel guide.');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this guide article?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      await deleteTravelGuideAction(id);
      showToast('Travel guide article removed.');
      const nextPage = guides.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await fetchGuidesPage(nextPage);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete guide.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const liveGuide = persistedGuide ?? currentGuide;
  const canViewOnWeb = Boolean(
    currentGuide?.id &&
      currentGuide.status === 'published' &&
      persistedGuide?.status === 'published' &&
      liveGuide?.city &&
      liveGuide?.category &&
      liveGuide?.slug
  );
  const viewOnWebHref =
    canViewOnWeb && liveGuide?.city && liveGuide?.category && liveGuide?.slug
      ? `/travel-guide/${encodeURIComponent(liveGuide.city.toLowerCase())}/${encodeURIComponent(liveGuide.category.toLowerCase())}/${encodeURIComponent(liveGuide.slug)}`
      : null;

  const sessionSavedAt = currentGuide?.id ? lastSavedById[currentGuide.id] : undefined;
  const lastSavedLabel = sessionSavedAt
    ? formatLastSaved(sessionSavedAt)
    : currentGuide?.id && currentGuide.publishDate
      ? currentGuide.publishDate
      : null;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] pb-px">
        <button
          type="button"
          onClick={() => {
            if (isEditing) handleBackToList();
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-[var(--color-brand)] text-[var(--color-brand)] cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>Travel Guides ({counts.all})</span>
        </button>
        <Link
          href="/admin/blog"
          onClick={(e) => {
            if (isActionRunningRef.current || !confirmLeave()) e.preventDefault();
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>Blog Posts</span>
        </Link>
      </div>

      {!isEditing ? (
        /* List View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
                Travel Guides
              </h1>
              <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
                Create and publish city guides, neighborhood tips, and local intelligence for remote workers.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNew}
              data-testid="new-guide-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Travel Guide</span>
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
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles by title, city or category..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by city"
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.city}>
                      {loc.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'all' | 'published' | 'draft');
                    setPage(1);
                  }}
                  className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
                >
                  <option value="all">All Statuses ({counts.all})</option>
                  <option value="published">Published ({counts.published})</option>
                  <option value="draft">Draft ({counts.draft})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Guides Table */}
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-neutral-400">Loading guides...</div>
            ) : guides.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <div className="text-sm font-semibold text-neutral-700">No travel guides found</div>
                <p className="text-xs text-neutral-400 mt-1">Try clearing filters or create a new guide article.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Article Title</th>
                      <th className="py-3 px-4">Destination / Tag</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {guides.map((guide) => (
                      <tr
                        key={guide.id}
                        data-testid={`guide-row-${guide.id}`}
                        className="hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)] max-w-md">
                          <div className="flex items-start gap-2">
                            {guide.featured && (
                              <span title="Featured on Homepage">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              </span>
                            )}
                            <span className="line-clamp-2">{guide.title}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-normal block mt-1">
                            Published: {guide.publishDate}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-600">
                          <span className="font-semibold text-neutral-800">{guide.city}</span> ·{' '}
                          <span>{guide.category}</span>
                        </td>
                        <td className="py-4 px-4">
                          {guide.status === 'draft' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Published
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-neutral-600">Editorial</td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {guide.status === 'published' && (
                              <Link
                                href={`/travel-guide/${guide.city.toLowerCase()}/${guide.category.toLowerCase()}/${guide.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View ${guide.title} on live site`}
                                className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                                title="View on Live Site"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(guide)}
                              data-testid={`edit-guide-${guide.id}`}
                              className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              Edit (WYSIWYG)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(guide.id)}
                              aria-label={`Delete ${guide.title}`}
                              className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Guide"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
              itemLabel="guides"
            />
          </div>
        </div>
      ) : (
        /* Full 2-Column Editorial View (AC-CMS-3) */
        <div className="space-y-6 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBackToList}
              data-testid="guide-back-btn"
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--color-brand)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Guides Table</span>
            </button>
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span>
                {currentGuide?.id ? `Editing Guide #${currentGuide.id}` : 'Drafting New Guide'}
              </span>
              {viewOnWebHref && (
                <Link
                  href={viewOnWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="guide-view-on-web-link"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                  <span>View on Web</span>
                </Link>
              )}
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 70%: Editorial Title, Summary, Rich Editor */}
            <div className="lg:col-span-2 space-y-5 min-w-0">
              <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-2xs space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Article Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentGuide?.title || ''}
                    onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                    placeholder="e.g. Relocating to Monterrey as an Expat..."
                    data-testid="guide-title-input"
                    className="w-full text-base font-bold p-3 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Excerpt / Lead Summary
                  </label>
                  <textarea
                    rows={2}
                    value={currentGuide?.excerpt || ''}
                    onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, excerpt: e.target.value } : null))}
                    placeholder="Short summary displayed on cards and search results..."
                    className="w-full text-xs p-3 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                  />
                </div>

                {/* Rich WYSIWYG Tiptap Editor */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Article Body (Rich WYSIWYG Editor)
                  </label>
                  <TiptapEditor
                    value={currentGuide?.content || ''}
                    onChange={(val) => setCurrentGuide((prev) => (prev ? { ...prev, content: val } : null))}
                    placeholder="Start typing your article, H2 headings, bullet lists, links, tables, or embed media..."
                    minHeight="360px"
                  />
                </div>
              </div>
            </div>

            {/* Right 30%: Publishing card, Destination, Category, Featured, SEO */}
            <div className="space-y-5 min-w-0">
              {/* Publishing Controls */}
              <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-2xs space-y-4">
                <h3 className="font-bold text-sm text-[var(--color-text-on-light)] pb-2 border-b border-[var(--color-border-light)]">
                  Publishing
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Status</label>
                    <select
                      value={currentGuide?.status || 'published'}
                      onChange={(e) =>
                        setCurrentGuide((prev) =>
                          prev ? { ...prev, status: e.target.value as 'published' | 'draft' } : null
                        )
                      }
                      data-testid="guide-status-select"
                      className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Publish Date</label>
                    <input
                      type="text"
                      value={currentGuide?.publishDate || ''}
                      onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, publishDate: e.target.value } : null))}
                      className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    />
                  </div>

                  <div
                    data-testid="guide-last-saved"
                    className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] pt-1"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{lastSavedLabel ? `Last saved: ${lastSavedLabel}` : 'Not saved yet'}</span>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSave('published')}
                      data-testid="publish-guide-btn"
                      className="w-full min-h-10 py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white font-semibold text-xs hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Publish Article'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSave('draft')}
                      data-testid="save-draft-guide-btn"
                      className="w-full min-h-10 py-2.5 px-4 rounded-xl border border-[var(--color-border-light)] bg-white text-neutral-700 font-semibold text-xs hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Save Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Taxonomy & Metadata Card */}
              <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-bold text-sm text-[var(--color-text-on-light)] pb-2 border-b border-[var(--color-border-light)]">
                  Destination &amp; Taxonomies
                </h3>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Destination City</label>
                  <select
                    value={currentGuide?.city || 'Barcelona'}
                    onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, city: e.target.value } : null))}
                    data-testid="guide-city-select"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  >
                    {currentGuide?.city &&
                      !locations.some(
                        (loc) => loc.city.toLowerCase() === currentGuide.city!.toLowerCase()
                      ) && (
                        <option value={currentGuide.city}>{currentGuide.city}</option>
                      )}
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.city}>
                        {loc.name} ({loc.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Category</label>
                  <select
                    value={currentGuide?.category || 'Activities'}
                    onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, category: e.target.value } : null))}
                    data-testid="guide-category-select"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Homepage Featured Checkbox (AC-CMS-3) */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentGuide?.featured ?? false}
                      onChange={(e) =>
                        setCurrentGuide((prev) => (prev ? { ...prev, featured: e.target.checked } : null))
                      }
                      data-testid="guide-featured-checkbox"
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-amber-900 text-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Feature on Homepage Highlights (AC-CMS-3)
                    </span>
                  </label>
                </div>

                <ImagePickerField
                  id="guide-cover-image"
                  label="Cover Image"
                  value={currentGuide?.image || ''}
                  onChange={(url) =>
                    setCurrentGuide((prev) => (prev ? { ...prev, image: url } : null))
                  }
                  placeholder="/seed/guide/placeholder.webp"
                  helperText="Upload, pick from Media Library, or enter a /seed/, /uploads/, or https:// URL."
                  testIdPrefix="guide-cover-image"
                  previewAlt={currentGuide?.title || 'Travel guide cover preview'}
                  modalTitle="Choose Guide Cover Image"
                />

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={currentGuide?.slug || ''}
                    onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, slug: e.target.value } : null))}
                    placeholder="auto-generated-from-title"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* SEO Metadata Card */}
              <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-bold text-sm text-[var(--color-text-on-light)] pb-2 border-b border-[var(--color-border-light)]">
                  SEO Metadata
                </h3>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">SEO Title</label>
                  <input
                    type="text"
                    maxLength={160}
                    value={currentGuide?.seoTitle || ''}
                    onChange={(e) => setCurrentGuide((prev) => (prev ? { ...prev, seoTitle: e.target.value } : null))}
                    placeholder="Defaults to article title if left blank"
                    data-testid="guide-seo-title-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    {(currentGuide?.seoTitle || '').length} / 160 chars
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={3}
                    maxLength={320}
                    value={currentGuide?.seoDescription || ''}
                    onChange={(e) =>
                      setCurrentGuide((prev) => (prev ? { ...prev, seoDescription: e.target.value } : null))
                    }
                    placeholder="Defaults to excerpt if left blank (150–160 chars recommended)"
                    data-testid="guide-seo-description-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    {(currentGuide?.seoDescription || '').length} / 320 chars
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Save Bar */}
          <div
            data-testid="guide-sticky-save-bar"
            className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-light)] bg-white/95 backdrop-blur-xs px-4 py-3 shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
              <span
                data-testid="guide-dirty-status"
                className={
                  isDirty
                    ? 'text-amber-700 font-semibold'
                    : 'text-[var(--color-text-on-light-muted)]'
                }
              >
                {isDirty ? 'Unsaved changes' : 'Ready to save'}
              </span>
              {lastSavedLabel && (
                <span className="text-[var(--color-text-on-light-muted)]">
                  · Last saved: {lastSavedLabel}
                </span>
              )}
              {formError && (
                <span role="alert" className="text-red-600 font-semibold">
                  · {formError}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBackToList}
                data-testid="guide-cancel-btn"
                className="min-h-10 px-4 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave('draft')}
                data-testid="guide-sticky-draft-btn"
                className="min-h-10 px-4 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave('published')}
                data-testid="guide-sticky-publish-btn"
                className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Publish Article</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
