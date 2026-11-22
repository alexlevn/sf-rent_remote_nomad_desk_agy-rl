'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import type { TravelGuide, Location } from '@/lib/types';
import {
  saveTravelGuideAction,
  deleteTravelGuideAction,
  fetchAdminGuidesPaginatedAction,
  fetchLocationsAction,
} from '@/app/admin/cms-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { getTravelGuideHref } from '@/lib/format';
import { BookOpen, Sparkles } from 'lucide-react';
import { useContentEditor } from '@/features/admin/content/use-content-editor';
import { ContentNavTabs } from '@/features/admin/content/content-nav-tabs';
import {
  CARD_CLASS,
  CardHeading,
  ContentEditorLayout,
  FIELD_CLASS,
  FIELD_LABEL_CLASS,
  SELECT_CLASS,
  type ContentEditorCopy,
} from '@/features/admin/content/content-editor-layout';
import {
  ContentFilterBar,
  ContentListHeader,
  ContentRowActions,
  ContentStatusPill,
  DismissibleError,
  FILTER_SELECT_CLASS,
  LIST_HEAD_ROW_CLASS,
  StatusFilterSelect,
  SuccessToast,
  useToastMessage,
} from '@/features/admin/content/content-list-parts';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Activities', 'Coworking', 'Neighborhoods', 'Cost of Living', 'City Guide'];
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

const EDITOR_COPY: ContentEditorCopy = {
  testIdPrefix: 'guide',
  backLabel: 'Back to Guides Table',
  editingLabel: (id) => `Editing Guide #${id}`,
  draftingLabel: 'Drafting New Guide',
  titleLabel: 'Article Title',
  titlePlaceholder: 'e.g. Relocating to Monterrey as an Expat...',
  publishLabel: 'Publish Article',
  seoTitlePlaceholder: 'Defaults to article title if left blank',
};

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
  const [actionError, setActionError] = useState<string | null>(null);
  const toast = useToastMessage();

  const isDeletingRef = useRef(false);
  const requestIdRef = useRef(0);

  // Load locations once for filter and editor city dropdown
  useEffect(() => {
    let active = true;
    const loadLocations = async () => {
      try {
        const locsData = await fetchLocationsAction();
        if (!active) return;
        startTransition(() => setLocations(locsData));
      } catch {
        // Non-blocking: city filter keeps All Cities option
      }
    };
    void loadLocations();
    return () => {
      active = false;
    };
  }, []);

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

  const fetchGuidesPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setActionError(null);
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

  const editor = useContentEditor<TravelGuide>({
    serialize: serializeGuideSnapshot,
    saveItem: async (payload) => (await saveTravelGuideAction(payload))?.guide?.id,
    successMessage: (title, isNew, status) =>
      isNew
        ? status === 'draft'
          ? `Travel Guide "${title}" saved as draft!`
          : `Travel Guide "${title}" published to /travel-guide!`
        : `Travel Guide "${title}" updated successfully!`,
    saveErrorFallback: 'Failed to save travel guide.',
    onSaved: async (message, isNew) => {
      toast.show(message);
      if (isNew && page !== 1) setPage(1);
      else await fetchGuidesPage(page);
    },
  });

  const handleOpenNew = () => {
    setActionError(null);
    editor.open({
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
    });
  };

  const handleOpenEdit = (guide: TravelGuide) => {
    setActionError(null);
    editor.open(guide, guide);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this guide article?')) return;
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setActionError(null);

    try {
      await deleteTravelGuideAction(id);
      toast.show('Travel guide article removed.');
      const nextPage = guides.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await fetchGuidesPage(nextPage);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete guide.');
    } finally {
      isDeletingRef.current = false;
    }
  };

  const { current, persisted } = editor;
  const liveGuide = persisted ?? current;
  const viewOnWebHref =
    current?.id &&
    current.status === 'published' &&
    persisted?.status === 'published' &&
    liveGuide?.city &&
    liveGuide.category &&
    liveGuide.slug
      ? getTravelGuideHref({ city: liveGuide.city, category: liveGuide.category, slug: liveGuide.slug })
      : null;

  const guideTaxonomy = (
    <div className={CARD_CLASS}>
      <CardHeading>Destination &amp; Taxonomies</CardHeading>

      <div>
        <label className={FIELD_LABEL_CLASS}>Destination City</label>
        <select
          value={current?.city || 'Barcelona'}
          onChange={(e) => editor.update('city', e.target.value)}
          data-testid="guide-city-select"
          className={SELECT_CLASS}
        >
          {current?.city && !locations.some((loc) => loc.city.toLowerCase() === current.city!.toLowerCase()) && (
            <option value={current.city}>{current.city}</option>
          )}
          {locations.map((loc) => (
            <option key={loc.id} value={loc.city}>
              {loc.name} ({loc.country})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={FIELD_LABEL_CLASS}>Category</label>
        <select
          value={current?.category || 'Activities'}
          onChange={(e) => editor.update('category', e.target.value)}
          data-testid="guide-category-select"
          className={SELECT_CLASS}
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
            checked={current?.featured ?? false}
            onChange={(e) => editor.update('featured', e.target.checked)}
            data-testid="guide-featured-checkbox"
            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="font-semibold text-amber-900 text-xs flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Feature on Homepage Highlights
          </span>
        </label>
      </div>

      <ImagePickerField
        id="guide-cover-image"
        label="Cover Image"
        value={current?.image || ''}
        onChange={(url) => editor.update('image', url)}
        placeholder="/seed/guide/placeholder.webp"
        helperText="Upload, pick from Media Library, or enter a /seed/, /uploads/, or https:// URL."
        testIdPrefix="guide-cover-image"
        previewAlt={current?.title || 'Travel guide cover preview'}
        modalTitle="Choose Guide Cover Image"
      />

      <div>
        <label className={FIELD_LABEL_CLASS}>URL Slug</label>
        <input
          type="text"
          value={current?.slug || ''}
          onChange={(e) => editor.update('slug', e.target.value)}
          placeholder="auto-generated-from-title"
          className={cn(FIELD_CLASS, 'font-mono text-[11px]')}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SuccessToast message={toast.message} />

      <ContentNavTabs
        active="guides"
        activeCount={counts.all}
        onActiveClick={() => {
          if (editor.isEditing) editor.close();
        }}
        canLeave={() => !editor.isBusy() && editor.confirmLeave()}
      />

      {!editor.isEditing ? (
        <div className="space-y-6">
          <ContentListHeader
            title="Travel Guides"
            description="Create and publish city guides, neighborhood tips, and local intelligence for remote workers."
            newLabel="New Travel Guide"
            newTestId="new-guide-btn"
            onNew={handleOpenNew}
          />

          <DismissibleError message={actionError} onDismiss={() => setActionError(null)} />

          <ContentFilterBar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Search travel guides by title, city, or category"
            searchPlaceholder="Search articles by title, city or category..."
          >
            <select
              aria-label="Filter by city"
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setPage(1);
              }}
              className={FILTER_SELECT_CLASS}
            >
              <option value="all">All Cities</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.city}>
                  {loc.name}
                </option>
              ))}
            </select>
            <StatusFilterSelect
              value={statusFilter}
              counts={counts}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          </ContentFilterBar>

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
                    <tr className={LIST_HEAD_ROW_CLASS}>
                      <th className="py-3 px-4">Article Title</th>
                      <th className="py-3 px-4">Destination / Tag</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {guides.map((guide) => (
                      <tr key={guide.id} data-testid={`guide-row-${guide.id}`} className="hover:bg-neutral-50/50 transition-colors">
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
                          <span className="font-semibold text-neutral-800">{guide.city}</span> · <span>{guide.category}</span>
                        </td>
                        <td className="py-4 px-4">
                          <ContentStatusPill status={guide.status} />
                        </td>
                        <td className="py-4 px-4 text-neutral-600">Editorial</td>
                        <td className="py-4 px-4 text-right">
                          <ContentRowActions
                            title={guide.title}
                            liveHref={
                              guide.status === 'published'
                                ? getTravelGuideHref({ city: guide.city, category: guide.category, slug: guide.slug })
                                : null
                            }
                            editTestId={`edit-guide-${guide.id}`}
                            deleteTitle="Delete Guide"
                            onEdit={() => handleOpenEdit(guide)}
                            onDelete={() => handleDelete(guide.id)}
                          />
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
        <ContentEditorLayout
          editor={editor}
          copy={EDITOR_COPY}
          viewOnWebHref={viewOnWebHref}
          taxonomy={guideTaxonomy}
        />
      )}
    </div>
  );
}
