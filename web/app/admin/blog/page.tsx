'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/lib/types';
import {
  saveBlogPostAction,
  deleteBlogPostAction,
  fetchAdminBlogPostsPaginatedAction,
} from '@/app/admin/cms-actions';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { useUnsavedChanges } from '@/features/media/use-unsaved-changes';
import { isSafeImagePath } from '@/lib/validations/media';
import {
  FileText,
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
  ArrowLeft,
  X,
  Clock,
  Save,
  Loader2,
} from 'lucide-react';

const BLOG_CATEGORIES = [
  'Remote Setup',
  'Apartment Insights',
  'Workation Tips',
  'Cost Guides',
  'Digital Nomad Lifestyle',
];
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

function serializePostSnapshot(post: Partial<BlogPost> | null): string {
  if (!post) return '';
  return JSON.stringify({
    title: post.title ?? '',
    slug: post.slug ?? '',
    category: post.category ?? '',
    readTime: post.readTime ?? '',
    publishDate: post.publishDate ?? '',
    author: post.author ?? '',
    image: post.image ?? '',
    excerpt: post.excerpt ?? '',
    content: post.content ?? '',
    seoTitle: post.seoTitle ?? '',
    seoDescription: post.seoDescription ?? '',
    status: post.status ?? 'published',
  });
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Editor mode state
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const [persistedPost, setPersistedPost] = useState<BlogPost | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>('');
  const [lastSavedById, setLastSavedById] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDirty = isEditing && serializePostSnapshot(currentPost) !== baselineSnapshot;
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

  const fetchPostsPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetchAdminBlogPostsPaginatedAction({
          page: targetPage,
          pageSize: PAGE_SIZE,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: statusFilter,
          search: debouncedSearch || undefined,
        });
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setPosts(res.items);
          setTotal(res.total);
          setCounts(res.counts);
          setLoading(false);
        });
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        startTransition(() => {
          setActionError(err instanceof Error ? err.message : 'Failed to load blog posts.');
          setLoading(false);
        });
      }
    },
    [categoryFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchPostsPage(page);
  }, [fetchPostsPage, page]);

  const handleOpenNew = () => {
    const draft: Partial<BlogPost> = {
      title: '',
      slug: '',
      category: 'Remote Setup',
      readTime: '5 min read',
      publishDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: 'NomadDesk Editorial Team',
      image: '/seed/blog/blog-nomad-gear.webp',
      excerpt: '',
      seoTitle: '',
      seoDescription: '',
      content: '<h2>Introduction</h2><p>Share your insights and tips for remote professionals...</p>',
      status: 'published',
    };
    setCurrentPost(draft);
    setPersistedPost(null);
    setBaselineSnapshot(serializePostSnapshot(draft));
    setFormError(null);
    setActionError(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (post: BlogPost) => {
    // Preserve seed content exactly (AC-CMS-3)
    const editable = { ...post };
    setCurrentPost(editable);
    setPersistedPost(post);
    setBaselineSnapshot(serializePostSnapshot(editable));
    setFormError(null);
    setActionError(null);
    setIsEditing(true);
  };

  const handleBackToList = () => {
    if (!confirmLeave()) return;
    setIsEditing(false);
    setCurrentPost(null);
    setPersistedPost(null);
    setBaselineSnapshot('');
    setFormError(null);
  };

  const handleSave = async (intentStatus?: 'published' | 'draft') => {
    if (!currentPost || isSubmitting || isActionRunningRef.current) return;

    if (!currentPost.title?.trim()) {
      setFormError('Please enter an article title.');
      return;
    }

    const trimmedImage = (currentPost.image ?? '').trim();
    if (!trimmedImage || !isSafeImagePath(trimmedImage)) {
      setFormError('Cover image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalStatus = intentStatus || currentPost.status || 'published';
      const payload: Partial<BlogPost> = {
        ...currentPost,
        image: trimmedImage,
        status: finalStatus,
        seoTitle: currentPost.seoTitle?.trim() || '',
        seoDescription: currentPost.seoDescription?.trim() || '',
        slug:
          currentPost.slug?.trim() ||
          currentPost.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
      };

      const isNew = !currentPost.id;
      const result = await saveBlogPostAction(payload);
      if (result?.post?.id) {
        const savedAt = new Date().toISOString();
        setLastSavedById((prev) => ({ ...prev, [result.post.id]: savedAt }));
      }
      showToast(
        isNew
          ? finalStatus === 'draft'
            ? `Blog article "${payload.title}" saved as draft!`
            : `Blog article "${payload.title}" published to /blog!`
          : `Blog article "${payload.title}" updated successfully!`
      );
      setBaselineSnapshot('');
      setIsEditing(false);
      setCurrentPost(null);
      setPersistedPost(null);
      if (isNew && page !== 1) {
        setPage(1);
      } else {
        await fetchPostsPage(page);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save blog post.');
    } finally {
      setIsSubmitting(false);
      isActionRunningRef.current = false;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      await deleteBlogPostAction(id);
      showToast('Blog article deleted.');
      const nextPage = posts.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await fetchPostsPage(nextPage);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete post.');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const livePost = persistedPost ?? currentPost;
  const canViewOnWeb = Boolean(
    currentPost?.id &&
      currentPost.status === 'published' &&
      persistedPost?.status === 'published' &&
      livePost?.slug
  );
  const viewOnWebHref =
    canViewOnWeb && livePost?.slug ? `/blog/${encodeURIComponent(livePost.slug)}` : null;

  const sessionSavedAt = currentPost?.id ? lastSavedById[currentPost.id] : undefined;
  const lastSavedLabel = sessionSavedAt
    ? formatLastSaved(sessionSavedAt)
    : currentPost?.id && currentPost.publishDate
      ? currentPost.publishDate
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
        <Link
          href="/admin/guides"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>Travel Guides</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            if (isEditing) handleBackToList();
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-[var(--color-brand)] text-[var(--color-brand)] cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Blog Posts ({counts.all})</span>
        </button>
      </div>

      {!isEditing ? (
        /* List View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
                Blog Posts
              </h1>
              <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
                Manage editorial articles, remote work lifestyle guides, hardware reviews, and mid-term tenancy advice.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNew}
              data-testid="new-blog-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Blog Post</span>
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
                  placeholder="Search articles by title or author..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
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

          {/* Blog Table */}
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-neutral-400">Loading blog posts...</div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <div className="text-sm font-semibold text-neutral-700">No blog articles found</div>
                <p className="text-xs text-neutral-400 mt-1">Try clearing filters or create a new article.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Article Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {posts.map((post) => (
                      <tr
                        key={post.id}
                        data-testid={`post-row-${post.id}`}
                        className="hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)] max-w-md">
                          <span className="line-clamp-2">{post.title}</span>
                          <span className="text-[10px] text-neutral-400 font-normal block mt-1">
                            Published: {post.publishDate} · {post.readTime}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-600 font-medium">{post.category}</td>
                        <td className="py-4 px-4">
                          {post.status === 'draft' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Published
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{post.author}</td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {post.status === 'published' && (
                              <Link
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View ${post.title} on live site`}
                                className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                                title="View on Live Site"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(post)}
                              data-testid={`edit-post-${post.id}`}
                              className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              Edit (WYSIWYG)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(post.id)}
                              aria-label={`Delete ${post.title}`}
                              className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Post"
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
              itemLabel="posts"
            />
          </div>
        </div>
      ) : (
        /* Full 2-Column Editorial View */
        <div className="space-y-6 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              data-testid="post-back-btn"
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--color-brand)] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Blog Table</span>
            </button>
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span>
                {currentPost?.id ? `Editing Article #${currentPost.id}` : 'Drafting New Article'}
              </span>
              {viewOnWebHref && (
                <Link
                  href={viewOnWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="post-view-on-web-link"
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
                    Post Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentPost?.title || ''}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                    placeholder="e.g. One Month or Three? Managing Mid-Term Rentals..."
                    data-testid="post-title-input"
                    className="w-full text-base font-bold p-3 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Excerpt / Lead Summary
                  </label>
                  <textarea
                    rows={2}
                    value={currentPost?.excerpt || ''}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, excerpt: e.target.value } : null))}
                    placeholder="Short summary displayed on cards and search results..."
                    className="w-full text-xs p-3 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Article Body (Rich WYSIWYG Editor)
                  </label>
                  <TiptapEditor
                    value={currentPost?.content || ''}
                    onChange={(val) => setCurrentPost((prev) => (prev ? { ...prev, content: val } : null))}
                    placeholder="Start typing your article, H2 headings, bullet lists, links, tables, or embed media..."
                    minHeight="360px"
                  />
                </div>
              </div>
            </div>

            {/* Right 30%: Publishing card, Taxonomy, Author, SEO */}
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
                      value={currentPost?.status || 'published'}
                      onChange={(e) =>
                        setCurrentPost((prev) =>
                          prev ? { ...prev, status: e.target.value as 'published' | 'draft' } : null
                        )
                      }
                      data-testid="post-status-select"
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
                      value={currentPost?.publishDate || ''}
                      onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, publishDate: e.target.value } : null))}
                      className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    />
                  </div>

                  <div
                    data-testid="post-last-saved"
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
                      data-testid="publish-post-btn"
                      className="w-full min-h-10 py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white font-semibold text-xs hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Publish Post'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSave('draft')}
                      data-testid="save-draft-post-btn"
                      className="w-full min-h-10 py-2.5 px-4 rounded-xl border border-[var(--color-border-light)] bg-white text-neutral-700 font-semibold text-xs hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Save Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Taxonomy Card */}
              <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-bold text-sm text-[var(--color-text-on-light)] pb-2 border-b border-[var(--color-border-light)]">
                  Category &amp; Attribution
                </h3>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Category</label>
                  <select
                    value={currentPost?.category || 'Remote Setup'}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, category: e.target.value } : null))}
                    data-testid="post-category-select"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  >
                    {currentPost?.category && !BLOG_CATEGORIES.includes(currentPost.category) && (
                      <option value={currentPost.category}>{currentPost.category}</option>
                    )}
                    {BLOG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={currentPost?.author || 'NomadDesk Editorial Team'}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, author: e.target.value } : null))}
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Read Time</label>
                  <input
                    type="text"
                    value={currentPost?.readTime || '5 min read'}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, readTime: e.target.value } : null))}
                    placeholder="e.g. 5 min read"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <ImagePickerField
                  id="blog-cover-image"
                  label="Cover Image"
                  value={currentPost?.image || ''}
                  onChange={(url) =>
                    setCurrentPost((prev) => (prev ? { ...prev, image: url } : null))
                  }
                  placeholder="/seed/blog/blog-nomad-gear.webp"
                  helperText="Upload, pick from Media Library, or enter a /seed/, /uploads/, or https:// URL."
                  testIdPrefix="blog-cover-image"
                  previewAlt={currentPost?.title || 'Blog post cover preview'}
                  modalTitle="Choose Blog Cover Image"
                />

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={currentPost?.slug || ''}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, slug: e.target.value } : null))}
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
                    value={currentPost?.seoTitle || ''}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, seoTitle: e.target.value } : null))}
                    placeholder="Defaults to post title if left blank"
                    data-testid="post-seo-title-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    {(currentPost?.seoTitle || '').length} / 160 chars
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={3}
                    maxLength={320}
                    value={currentPost?.seoDescription || ''}
                    onChange={(e) =>
                      setCurrentPost((prev) => (prev ? { ...prev, seoDescription: e.target.value } : null))
                    }
                    placeholder="Defaults to excerpt if left blank (150–160 chars recommended)"
                    data-testid="post-seo-description-input"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    {(currentPost?.seoDescription || '').length} / 320 chars
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Save Bar */}
          <div
            data-testid="post-sticky-save-bar"
            className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-light)] bg-white/95 backdrop-blur-xs px-4 py-3 shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
              <span
                data-testid="post-dirty-status"
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBackToList}
                data-testid="post-cancel-btn"
                className="min-h-10 px-4 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave('draft')}
                data-testid="post-sticky-draft-btn"
                className="min-h-10 px-4 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave('published')}
                data-testid="post-sticky-publish-btn"
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
                    <span>Publish Post</span>
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
