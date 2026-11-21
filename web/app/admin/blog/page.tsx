'use client';

import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/lib/types';
import { listBlogPosts } from '@/lib/api/blog';
import { saveBlogPostAction, deleteBlogPostAction } from '@/app/admin/cms-actions';
import { CmsRichEditorMock } from '@/features/admin/cms-rich-editor-mock';
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
} from 'lucide-react';

const BLOG_CATEGORIES = [
  'Remote Setup',
  'Apartment Insights',
  'Workation Tips',
  'Cost Guides',
  'Digital Nomad Lifestyle',
];

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editor mode state
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isActionRunningRef = useRef(false);

  const fetchPosts = async () => {
    try {
      const data = await listBlogPosts({ includeDrafts: true, status: 'all' });
      startTransition(() => {
        setPosts(data);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [posts, search, categoryFilter, statusFilter]);

  const handleOpenNew = () => {
    setCurrentPost({
      title: '',
      slug: '',
      category: 'Remote Setup',
      readTime: '5 min read',
      publishDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: 'NomadDesk Editorial Team',
      image: '/seed/blog/blog-nomad-gear.webp',
      excerpt: '',
      content: '<h2>Introduction</h2><p>Share your insights and tips for remote professionals...</p>',
      status: 'published',
    });
    setFormError(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (post: BlogPost) => {
    // Preserve seed content exactly (AC-CMS-3)
    setCurrentPost({ ...post });
    setFormError(null);
    setIsEditing(true);
  };

  const handleSave = async (intentStatus?: 'published' | 'draft') => {
    if (!currentPost || isSubmitting || isActionRunningRef.current) return;

    if (!currentPost.title?.trim()) {
      setFormError('Please enter an article title.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalStatus = intentStatus || currentPost.status || 'published';
      const payload: Partial<BlogPost> = {
        ...currentPost,
        status: finalStatus,
        slug:
          currentPost.slug ||
          currentPost.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
      };

      await saveBlogPostAction(payload);
      showToast(
        currentPost.id
          ? `Blog article "${payload.title}" updated successfully!`
          : `Blog article "${payload.title}" published to /blog!`
      );
      setIsEditing(false);
      setCurrentPost(null);
      await fetchPosts();
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

    try {
      await deleteBlogPostAction(id);
      showToast('Blog article deleted.');
      await fetchPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      isActionRunningRef.current = false;
    }
  };

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
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>Travel Guides</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-[var(--color-brand)] text-[var(--color-brand)] cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Blog Posts ({posts.length})</span>
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
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
                  className="text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          {/* Blog Table */}
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-neutral-400">Loading blog posts...</div>
            ) : filteredPosts.length === 0 ? (
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
                    {filteredPosts.map((post) => (
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
          </div>
        </div>
      ) : (
        /* Full 2-Column Editorial View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand)] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Blog Table</span>
            </button>
            <div className="text-xs text-neutral-400">
              {currentPost?.id ? `Editing Article #${currentPost.id}` : 'Drafting New Article'}
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 70%: Editorial Title, Summary, Rich Editor */}
            <div className="lg:col-span-2 space-y-5">
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
                  <CmsRichEditorMock
                    value={currentPost?.content || ''}
                    onChange={(val) => setCurrentPost((prev) => (prev ? { ...prev, content: val } : null))}
                    placeholder="Start typing your article, H2 headings, bullet lists, links, or embed images..."
                    minHeight="360px"
                  />
                </div>
              </div>
            </div>

            {/* Right 30%: Publishing card, Taxonomy, Author */}
            <div className="space-y-5">
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

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSave('published')}
                      data-testid="publish-post-btn"
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white font-semibold text-xs hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Publish Post'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSave('draft')}
                      data-testid="save-draft-post-btn"
                      className="w-full py-2.5 px-4 rounded-xl border border-[var(--color-border-light)] bg-white text-neutral-700 font-semibold text-xs hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
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

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={currentPost?.image || ''}
                    onChange={(e) => setCurrentPost((prev) => (prev ? { ...prev, image: e.target.value } : null))}
                    placeholder="/seed/blog/blog-nomad-gear.webp"
                    className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] font-mono text-[11px]"
                  />
                </div>

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
