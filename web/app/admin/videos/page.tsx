'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import type { CommunityVideo } from '@/lib/types';
import {
  saveVideoAction,
  deleteVideoAction,
  reorderVideosAction,
  fetchVideosAction,
} from '@/app/admin/cms-actions';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { isSafeImagePath } from '@/lib/validations/media';
import {
  Video,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<CommunityVideo> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isActionRunningRef = useRef(false);

  const fetchVideos = async () => {
    try {
      const data = await fetchVideosAction();
      startTransition(() => {
        setVideos(data);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Close reel modal on Escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingVideo({
      platform: 'Instagram',
      authorName: '',
      url: '',
      avatar: '/seed/location/madrid.jpg',
      aspect: '9:16',
      isActive: true,
      position: videos.length + 1,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: CommunityVideo) => {
    setEditingVideo({ ...v });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleVisible = async (v: CommunityVideo) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;

    try {
      const nextActive = v.isActive === false;
      await saveVideoAction({ id: v.id, isActive: nextActive });
      showToast(`Reel ${v.authorName} is now ${nextActive ? 'visible' : 'hidden'} on homepage.`);
      await fetchVideos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this community reel?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;

    try {
      await deleteVideoAction(id);
      showToast('Community reel removed.');
      await fetchVideos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove reel');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;

    try {
      const copy = [...videos];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      const orderedIds = copy.map((v) => v.id);
      await reorderVideosAction(orderedIds);
      showToast('Reel order updated on homepage.');
      await fetchVideos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reorder reels');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo || isSubmitting || isActionRunningRef.current) return;

    if (!editingVideo.authorName || !editingVideo.url) {
      setFormError('Please enter creator handle and embed URL.');
      return;
    }

    const trimmedAvatar = (editingVideo.avatar || '').trim();
    if (!trimmedAvatar || !isSafeImagePath(trimmedAvatar)) {
      setFormError('Avatar image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    isActionRunningRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveVideoAction({ ...editingVideo, avatar: trimmedAvatar });
      showToast(
        editingVideo.id
          ? `Reel for ${editingVideo.authorName} updated successfully!`
          : `New reel for ${editingVideo.authorName} added to homepage carousel!`
      );
      setIsModalOpen(false);
      setEditingVideo(null);
      await fetchVideos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save video reel');
    } finally {
      setIsSubmitting(false);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-[var(--color-text-on-light)] font-medium">Content Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            Community Reels Management
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
            Curate and reorder Instagram / TikTok vertical reels displayed in the community showcase on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          data-testid="add-reel-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Reel</span>
        </button>
      </div>

      {/* Videos Data Table */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading reels...</div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center">
            <Video className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-neutral-700">No community reels found</div>
            <p className="text-xs text-neutral-400 mt-1">Add a new Instagram or TikTok reel link to showcase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Creator Handle</th>
                  <th className="py-3 px-4">Embed URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sort Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {videos.map((v, index) => {
                  const isHidden = v.isActive === false;

                  return (
                    <tr
                      key={v.id}
                      data-testid={`reel-row-${v.id}`}
                      className={`hover:bg-neutral-50/50 transition-colors ${
                        isHidden ? 'opacity-60 bg-neutral-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[var(--color-text-on-light)]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                          <span>{v.authorName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-600 max-w-xs truncate">
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[var(--color-brand)] underline"
                        >
                          {v.url}
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        {isHidden ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                            Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Visible
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-700">
                          <span>#{index + 1}</span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMove(index, 'up')}
                              className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3 text-neutral-600" />
                            </button>
                            <button
                              type="button"
                              disabled={index === videos.length - 1}
                              onClick={() => handleMove(index, 'down')}
                              className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3 text-neutral-600" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleVisible(v)}
                            title={isHidden ? 'Show on homepage' : 'Hide from homepage'}
                            className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-100 text-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v.id)}
                            style={{ color: 'var(--color-brand)' }}
                            className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Remove
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

      {/* Modal: Add / Edit Reel */}
      {isModalOpen && editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
              <h2 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <Video className="w-5 h-5 text-[var(--color-brand)]" />
                <span>{editingVideo.id ? 'Edit Reel' : 'Add Community Reel'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Creator Handle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingVideo.authorName || ''}
                  onChange={(e) => setEditingVideo((prev) => ({ ...prev, authorName: e.target.value }))}
                  placeholder="e.g. @gringagoiana"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Embed URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={editingVideo.url || ''}
                  onChange={(e) => setEditingVideo((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://www.instagram.com/p/DeJ6Y_ROFUP/"
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Platform</label>
                <select
                  value={editingVideo.platform || 'Instagram'}
                  onChange={(e) => setEditingVideo((prev) => ({ ...prev, platform: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube Shorts</option>
                </select>
              </div>

              <ImagePickerField
                id="video-avatar-image"
                label="Avatar / Thumbnail"
                value={editingVideo.avatar || ''}
                onChange={(url) =>
                  setEditingVideo((prev) => (prev ? { ...prev, avatar: url } : null))
                }
                placeholder="/seed/location/madrid.jpg"
                helperText="Shown as the circular creator avatar in the homepage community reels."
                testIdPrefix="video-avatar-image"
                previewAlt={editingVideo.authorName || 'Creator avatar'}
                previewAspect="square"
                modalTitle="Choose Creator Avatar"
              />

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingVideo.isActive !== false}
                    onChange={(e) => setEditingVideo((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                  />
                  <span className="font-semibold text-neutral-800">
                    Visible in Community Showcase on Homepage
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-light)]">
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
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Reel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
