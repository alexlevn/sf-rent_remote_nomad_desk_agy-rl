'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Video, X } from 'lucide-react';
import type { CommunityVideo } from '@/lib/types';
import { saveVideoAction } from '@/app/admin/cms-actions';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { isSafeImagePath } from '@/lib/validations/media';
import { cn } from '@/lib/utils';
import { isSafeHttpUrl } from './is-safe-http-url';

interface VideoEditModalProps {
  initial: Partial<CommunityVideo>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}

export function VideoEditModal({ initial, onClose, onSaved }: VideoEditModalProps) {
  const [editingVideo, setEditingVideo] = useState<Partial<CommunityVideo>>(() => ({ ...initial }));
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isBusyRef = useRef(false);

  // Close on Escape (skip if media picker is open or save is in flight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !isMediaPickerOpen && !isBusyRef.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMediaPickerOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isBusyRef.current) return;

    const rawHandle = (editingVideo.authorName || '').trim();
    const trimmedUrl = (editingVideo.url || '').trim();

    if (!rawHandle || !trimmedUrl) {
      setFormError('Please enter creator handle and embed URL.');
      return;
    }
    if (!isSafeHttpUrl(trimmedUrl)) {
      setFormError('Embed URL must start with https:// or http://.');
      return;
    }

    const trimmedAvatar = (editingVideo.avatar || '').trim();
    if (!trimmedAvatar || !isSafeImagePath(trimmedAvatar)) {
      setFormError('Avatar image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    const normalizedHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

    isBusyRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveVideoAction({ ...editingVideo, authorName: normalizedHandle, url: trimmedUrl, avatar: trimmedAvatar });
      await onSaved(
        editingVideo.id
          ? `Reel for ${normalizedHandle} updated successfully!`
          : `New reel for ${normalizedHandle} added to homepage carousel!`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save video reel');
    } finally {
      setIsSubmitting(false);
      isBusyRef.current = false;
    }
  };

  const title = editingVideo.id ? 'Edit Reel' : 'Add Community Reel';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in',
        // Hide (not unmount) while the nested media picker is open so form state survives
        isMediaPickerOpen ? 'hidden' : '',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] mb-4">
          <h2 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
            <Video className="w-5 h-5 text-[var(--color-brand)]" />
            <span>{title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
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
              setEditingVideo((prev) => ({ ...prev, avatar: url }))
            }
            onModalOpenChange={setIsMediaPickerOpen}
            placeholder="/seed/location/2241.jpg"
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
              onClick={onClose}
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
  );
}
