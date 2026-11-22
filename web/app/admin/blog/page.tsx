'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import type { BlogPost } from '@/lib/types';
import {
  saveBlogPostAction,
  deleteBlogPostAction,
  fetchAdminBlogPostsPaginatedAction,
} from '@/app/admin/cms-actions';
import { PaginationBar } from '@/features/admin/pagination-bar';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { FileText } from 'lucide-react';
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

const BLOG_CATEGORIES = [
  'Remote Setup',
  'Apartment Insights',
  'Workation Tips',
  'Cost Guides',
  'Digital Nomad Lifestyle',
];
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

const EDITOR_COPY: ContentEditorCopy = {
  testIdPrefix: 'post',
  backLabel: 'Back to Blog Table',
  editingLabel: (id) => `Editing Article #${id}`,
  draftingLabel: 'Drafting New Article',
  titleLabel: 'Post Title',
  titlePlaceholder: 'e.g. One Month or Three? Managing Mid-Term Rentals...',
  publishLabel: 'Publish Post',
  seoTitlePlaceholder: 'Defaults to post title if left blank',
};

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

function blogHref(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
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
  const [actionError, setActionError] = useState<string | null>(null);
  const toast = useToastMessage();

  const isDeletingRef = useRef(false);
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

  const fetchPostsPage = useCallback(
    async (targetPage: number) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      setActionError(null);
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

  const editor = useContentEditor<BlogPost>({
    serialize: serializePostSnapshot,
    saveItem: async (payload) => (await saveBlogPostAction(payload))?.post?.id,
    successMessage: (title, isNew, status) =>
      isNew
        ? status === 'draft'
          ? `Blog article "${title}" saved as draft!`
          : `Blog article "${title}" published to /blog!`
        : `Blog article "${title}" updated successfully!`,
    saveErrorFallback: 'Failed to save blog post.',
    onSaved: async (message, isNew) => {
      toast.show(message);
      if (isNew && page !== 1) setPage(1);
      else await fetchPostsPage(page);
    },
  });

  const handleOpenNew = () => {
    setActionError(null);
    editor.open({
      title: '',
      slug: '',
      category: 'Remote Setup',
      readTime: '5 min read',
      publishDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: 'NomadDesk Editorial Team',
      image: '/seed/blog/blog-1.webp',
      excerpt: '',
      seoTitle: '',
      seoDescription: '',
      content: '<h2>Introduction</h2><p>Share your insights and tips for remote professionals...</p>',
      status: 'published',
    });
  };

  const handleOpenEdit = (post: BlogPost) => {
    setActionError(null);
    editor.open(post, post);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setActionError(null);

    try {
      await deleteBlogPostAction(id);
      toast.show('Blog article deleted.');
      const nextPage = posts.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await fetchPostsPage(nextPage);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete post.');
    } finally {
      isDeletingRef.current = false;
    }
  };

  const { current, persisted } = editor;
  const livePost = persisted ?? current;
  const viewOnWebHref =
    current?.id && current.status === 'published' && persisted?.status === 'published' && livePost?.slug
      ? blogHref(livePost.slug)
      : null;

  const postTaxonomy = (
    <div className={CARD_CLASS}>
      <CardHeading>Category &amp; Attribution</CardHeading>

      <div>
        <label className={FIELD_LABEL_CLASS}>Category</label>
        <select
          value={current?.category || 'Remote Setup'}
          onChange={(e) => editor.update('category', e.target.value)}
          data-testid="post-category-select"
          className={SELECT_CLASS}
        >
          {current?.category && !BLOG_CATEGORIES.includes(current.category) && (
            <option value={current.category}>{current.category}</option>
          )}
          {BLOG_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={FIELD_LABEL_CLASS}>Author</label>
        <input
          type="text"
          value={current?.author ?? ''}
          onChange={(e) => editor.update('author', e.target.value)}
          placeholder="NomadDesk Editorial Team"
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label className={FIELD_LABEL_CLASS}>Read Time</label>
        <input
          type="text"
          value={current?.readTime ?? ''}
          onChange={(e) => editor.update('readTime', e.target.value)}
          placeholder="e.g. 5 min read"
          className={FIELD_CLASS}
        />
      </div>

      <ImagePickerField
        id="blog-cover-image"
        label="Cover Image"
        value={current?.image || ''}
        onChange={(url) => editor.update('image', url)}
        placeholder="/seed/blog/blog-1.webp"
        helperText="Upload, pick from Media Library, or enter a /seed/, /uploads/, or https:// URL."
        testIdPrefix="blog-cover-image"
        previewAlt={current?.title || 'Blog post cover preview'}
        modalTitle="Choose Blog Cover Image"
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
        active="blog"
        activeCount={counts.all}
        onActiveClick={() => {
          if (editor.isEditing) editor.close();
        }}
        canLeave={() => !editor.isBusy() && editor.confirmLeave()}
      />

      {!editor.isEditing ? (
        <div className="space-y-6">
          <ContentListHeader
            title="Blog Posts"
            description="Manage editorial articles, remote work lifestyle guides, hardware reviews, and mid-term tenancy advice."
            newLabel="New Blog Post"
            newTestId="new-blog-btn"
            onNew={handleOpenNew}
          />

          <DismissibleError message={actionError} onDismiss={() => setActionError(null)} />

          <ContentFilterBar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Search blog posts by title or author"
            searchPlaceholder="Search articles by title or author..."
          >
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className={FILTER_SELECT_CLASS}
            >
              <option value="all">All Categories</option>
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                    <tr className={LIST_HEAD_ROW_CLASS}>
                      <th className="py-3 px-4">Article Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {posts.map((post) => (
                      <tr key={post.id} data-testid={`post-row-${post.id}`} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-[var(--color-text-on-light)] max-w-md">
                          <span className="line-clamp-2">{post.title}</span>
                          <span className="text-[10px] text-neutral-400 font-normal block mt-1">
                            Published: {post.publishDate} · {post.readTime}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-600 font-medium">{post.category}</td>
                        <td className="py-4 px-4">
                          <ContentStatusPill status={post.status} />
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{post.author}</td>
                        <td className="py-4 px-4 text-right">
                          <ContentRowActions
                            title={post.title}
                            liveHref={post.status === 'published' ? blogHref(post.slug) : null}
                            editTestId={`edit-post-${post.id}`}
                            deleteTitle="Delete Post"
                            onEdit={() => handleOpenEdit(post)}
                            onDelete={() => handleDelete(post.id)}
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
              itemLabel="posts"
            />
          </div>
        </div>
      ) : (
        <ContentEditorLayout editor={editor} copy={EDITOR_COPY} viewOnWebHref={viewOnWebHref} taxonomy={postTaxonomy} />
      )}
    </div>
  );
}
