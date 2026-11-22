'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import Link from 'next/link';
import type { CommunityVideo } from '@/lib/types';
import {
  saveVideoAction,
  deleteVideoAction,
  reorderVideosAction,
  fetchVideosAction,
} from '@/app/admin/cms-actions';
import { VideoEditModal } from '@/features/admin/videos/video-edit-modal';
import { isSafeHttpUrl } from '@/features/admin/videos/is-safe-http-url';
import {
  Video,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingVideo, setEditingVideo] = useState<Partial<CommunityVideo> | null>(null);
  const isActionRunningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVideos = async () => {
    setActionError(null);
    try {
      const data = await fetchVideosAction();
      startTransition(() => {
        setVideos(data);
        setLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setActionError(err instanceof Error ? err.message : 'Failed to load community reels.');
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchVideos();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setActionError(null);
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingVideo({
      platform: 'Instagram',
      authorName: '',
      url: '',
      avatar: '/seed/location/2241.jpg',
      aspect: '9:16',
      isActive: true,
      position: videos.length + 1,
    });
    setActionError(null);
  };

  const handleOpenEdit = (v: CommunityVideo) => {
    setEditingVideo({ ...v });
    setActionError(null);
  };

  const handleToggleVisible = async (v: CommunityVideo) => {
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      const nextActive = v.isActive === false;
      await saveVideoAction({ id: v.id, isActive: nextActive });
      showToast(`Reel ${v.authorName} is now ${nextActive ? 'visible' : 'hidden'} on homepage.`);
      await fetchVideos();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this community reel?')) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

    try {
      await deleteVideoAction(id);
      showToast('Community reel removed.');
      await fetchVideos();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove reel');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videos.length) return;
    if (isActionRunningRef.current) return;
    isActionRunningRef.current = true;
    setActionError(null);

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
      setActionError(err instanceof Error ? err.message : 'Failed to reorder reels');
    } finally {
      isActionRunningRef.current = false;
    }
  };

  const handleSaved = async (message: string) => {
    showToast(message);
    setEditingVideo(null);
    await fetchVideos();
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <span>View on Web</span>
          </Link>
          <button
            type="button"
            onClick={handleOpenAdd}
            data-testid="add-reel-btn"
            className="flex min-h-10 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Reel</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2"
        >
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
                      className={cn(
                        'hover:bg-neutral-50/50 transition-colors',
                        isHidden ? 'opacity-60 bg-neutral-50/30' : '',
                      )}
                    >
                      <td className="py-3.5 px-4 font-bold text-[var(--color-text-on-light)]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                          <span>{v.authorName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-600 max-w-xs truncate">
                        {isSafeHttpUrl(v.url) ? (
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--color-brand)] underline"
                          >
                            {v.url}
                          </a>
                        ) : (
                          <span className="text-neutral-400">{v.url}</span>
                        )}
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
                              aria-label={`Move ${v.authorName} up`}
                              className="p-0.5 rounded hover:bg-neutral-200 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3 text-neutral-600" />
                            </button>
                            <button
                              type="button"
                              disabled={index === videos.length - 1}
                              onClick={() => handleMove(index, 'down')}
                              aria-label={`Move ${v.authorName} down`}
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
                            aria-label={isHidden ? `Show ${v.authorName} on homepage` : `Hide ${v.authorName} from homepage`}
                            title={isHidden ? 'Show on homepage' : 'Hide from homepage'}
                            className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="inline-flex min-h-10 sm:min-h-8 items-center px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-neutral-700 hover:bg-neutral-100 text-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v.id)}
                            className="inline-flex min-h-10 sm:min-h-8 items-center px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
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

      {editingVideo && (
        <VideoEditModal initial={editingVideo} onClose={() => setEditingVideo(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
