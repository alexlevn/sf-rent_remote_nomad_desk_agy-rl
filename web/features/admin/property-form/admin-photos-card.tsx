'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Image as ImageIcon, Images, Plus, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyImagesController } from '@/features/property-form/use-property-images';
import { SEED_PROPERTY_GALLERY } from '@/features/property-form/seed-gallery';
import { cardClass } from './form-ui';

const ROW_BTN_CLASS =
  'flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-lg border bg-white cursor-pointer';

interface AdminPhotosCardProps {
  photos: PropertyImagesController;
  title: string;
  fieldError?: string;
}

export function AdminPhotosCard({ photos, title, fieldError }: AdminPhotosCardProps) {
  const { images, imageError } = photos;
  const coverImage = images[0] ?? null;

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-border-light)]">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text-on-light)]">Property Photos ({images.length})</h2>
        </div>
      </div>

      {coverImage ? (
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
          <Image
            src={coverImage}
            alt={title.trim() || 'Property cover photo'}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="object-cover"
          />
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-100/95 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            Cover Photo
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center aspect-16/10 rounded-xl border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-light)] p-4 text-center text-xs text-[var(--color-text-on-light-muted)]">
          <ImageIcon className="w-6 h-6 text-[var(--color-text-light-subtle)] mb-1.5" />
          <span>No cover photo selected yet.</span>
        </div>
      )}

      <button
        type="button"
        data-testid="property-open-media-btn"
        onClick={() => photos.setMediaModalOpen(true)}
        className="w-full min-h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-brand)] bg-[var(--color-brand-light)] px-3.5 py-2 text-xs font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-[var(--color-brand-text)] transition-colors cursor-pointer"
      >
        <Images className="w-4 h-4" />
        <span>Upload / Media Library</span>
      </button>

      <div className="space-y-2">
        <label
          htmlFor="property-image-url"
          className="block text-[11px] font-semibold text-[var(--color-text-on-light-muted)]"
        >
          Or paste image URL / local path
        </label>
        <div className="flex items-center gap-2">
          <input
            id="property-image-url"
            type="text"
            data-testid="property-image-url-input"
            value={photos.urlDraft}
            onChange={(e) => photos.setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                photos.addUrlDraft();
              }
            }}
            placeholder="/uploads/..., /seed/..., or https://..."
            aria-label="Image URL or path"
            className="flex-1 min-w-0 min-h-10 text-xs py-2 px-3 rounded-lg border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/25"
          />
          <button
            type="button"
            onClick={photos.addUrlDraft}
            data-testid="property-add-image-btn"
            className="min-h-10 shrink-0 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-semibold inline-flex items-center gap-1 text-xs px-3 py-2 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Photo</span>
          </button>
        </div>

        <button
          type="button"
          onClick={photos.toggleSeedPicker}
          className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs px-3 py-1.5 transition-colors cursor-pointer"
        >
          {photos.isSeedPickerOpen ? 'Hide Seed Gallery' : 'Pick from Seed Gallery'}
        </button>

        {imageError && (
          <p className="text-xs text-red-600" role="alert">
            {imageError}
          </p>
        )}
        {fieldError && (
          <p data-field-error="true" className="text-xs text-red-600" role="alert">
            {fieldError}
          </p>
        )}
      </div>

      {photos.isSeedPickerOpen && (
        <div className="p-3 rounded-xl bg-neutral-50 border border-[var(--color-border-light)]">
          <p className="text-xs font-semibold text-[var(--color-text-on-light-muted)] mb-2">
            Click to add or remove seed photos:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SEED_PROPERTY_GALLERY.map((url) => {
              const selected = images.includes(url);
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => photos.toggleImage(url)}
                  className={cn(
                    'relative h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                    selected
                      ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/25'
                      : 'border-transparent hover:border-neutral-300',
                  )}
                >
                  <Image src={url} alt={url} fill unoptimized sizes="140px" className="object-cover" />
                  {selected && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[var(--color-brand)] text-white text-[10px] font-bold">
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--color-text-on-light-muted)]">
            First photo is the cover image. Use arrows to reorder.
          </p>
          <ul className="space-y-2 max-h-80 overflow-y-auto pr-0.5" data-testid="property-images-list">
            {images.map((img, idx) => (
              <li
                key={`${img}-${idx}`}
                className="flex items-center gap-2.5 p-2 rounded-xl border border-[var(--color-border-light)] bg-neutral-50/70"
              >
                <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                  <Image
                    src={img}
                    alt={`Property photo ${idx + 1}`}
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text-on-light)]">#{idx + 1}</span>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        Cover
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[var(--color-text-on-light-muted)] truncate" title={img}>
                    {img}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => photos.moveImage(idx, 'up')}
                    disabled={idx === 0}
                    title="Move up"
                    aria-label={`Move photo ${idx + 1} up`}
                    className={cn(
                      ROW_BTN_CLASS,
                      'border-[var(--color-border-light)] text-[var(--color-text-on-light)] hover:bg-neutral-100 disabled:opacity-35 disabled:cursor-not-allowed',
                    )}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => photos.moveImage(idx, 'down')}
                    disabled={idx === images.length - 1}
                    title="Move down"
                    aria-label={`Move photo ${idx + 1} down`}
                    className={cn(
                      ROW_BTN_CLASS,
                      'border-[var(--color-border-light)] text-[var(--color-text-on-light)] hover:bg-neutral-100 disabled:opacity-35 disabled:cursor-not-allowed',
                    )}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => photos.removeImage(idx)}
                    title="Remove photo"
                    aria-label={`Remove photo ${idx + 1}`}
                    className={cn(ROW_BTN_CLASS, 'border-red-200 text-red-600 hover:bg-red-50')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
