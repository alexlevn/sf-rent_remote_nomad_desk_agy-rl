'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Check, Image as ImageIcon, Images, Plus, Star, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyImagesController } from '@/features/property-form/use-property-images';
import { HOST_SEED_PROPERTY_GALLERY } from '@/features/property-form/seed-gallery';
import { SectionHeading } from './form-ui';

const ICON_BTN_CLASS =
  'inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded border bg-white cursor-pointer';
const MOVE_BTN_CLASS = cn(
  ICON_BTN_CLASS,
  'border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed',
);

interface PhotoCardProps {
  url: string;
  index: number;
  total: number;
  photos: PropertyImagesController;
}

function PhotoCard({ url, index, total, photos }: PhotoCardProps) {
  return (
    <div
      data-testid={`host-photo-card-${index}`}
      className="rounded-xl overflow-hidden border border-neutral-200 bg-white flex flex-col"
    >
      <div className="relative aspect-4/3 bg-neutral-100">
        <Image
          src={url}
          alt={`Property photo ${index + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="object-cover"
          unoptimized
        />
        {index === 0 && (
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900/85 text-white flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            Cover
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-neutral-50 border-t border-neutral-200">
        <div className="flex items-center gap-1">
          {index !== 0 ? (
            <button
              type="button"
              onClick={() => photos.setCover(index)}
              title="Set as Cover Photo"
              aria-label={`Set photo ${index + 1} as cover`}
              data-testid={`host-photo-cover-${index}`}
              className="min-h-10 sm:min-h-8 px-2.5 sm:px-2 py-1 rounded border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 text-[11px] font-semibold cursor-pointer"
            >
              Set Cover
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-neutral-500 px-1">Primary</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => photos.moveImage(index, 'up')}
            disabled={index === 0}
            title="Move photo up"
            aria-label={`Move photo ${index + 1} up`}
            data-testid={`host-photo-up-${index}`}
            className={MOVE_BTN_CLASS}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => photos.moveImage(index, 'down')}
            disabled={index === total - 1}
            title="Move photo down"
            aria-label={`Move photo ${index + 1} down`}
            data-testid={`host-photo-down-${index}`}
            className={MOVE_BTN_CLASS}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => photos.removeImage(index)}
            title="Remove photo"
            aria-label={`Remove photo ${index + 1}`}
            data-testid={`host-photo-remove-${index}`}
            className={cn(ICON_BTN_CLASS, 'border-rose-200 text-rose-600 hover:bg-rose-50')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ListingPhotosSectionProps {
  photos: PropertyImagesController;
  fieldError?: string;
}

export function ListingPhotosSection({ photos, fieldError }: ListingPhotosSectionProps) {
  const { images, imageError } = photos;

  return (
    <section aria-labelledby="section-photos">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-5 border-b border-neutral-200">
        <SectionHeading id="section-photos" icon={ImageIcon}>
          2. Property Photos & Media Gallery
        </SectionHeading>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="host-open-media-btn"
            onClick={() => photos.setMediaModalOpen(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Images className="w-3.5 h-3.5" />
            <span>Upload / Media Library</span>
          </button>
          <button
            type="button"
            onClick={photos.toggleSeedPicker}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{photos.isSeedPickerOpen ? 'Close Gallery' : 'Select from Seed Gallery'}</span>
          </button>
        </div>
      </div>

      {fieldError && (
        <p role="alert" className="text-xs text-rose-600 mb-3">
          {fieldError}
        </p>
      )}

      <div className="mb-4">
        <div className="text-xs font-semibold text-neutral-600 mb-2">
          Selected Photos ({images.length}) — First photo is the primary cover image:
        </div>
        {images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-xs text-neutral-500">
            No photos selected yet. Upload from Media Library, pick from Seed Gallery, or enter an image URL below.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((imgUrl, idx) => (
              <PhotoCard key={`${imgUrl}-${idx}`} url={imgUrl} index={idx} total={images.length} photos={photos} />
            ))}
          </div>
        )}
      </div>

      {photos.isSeedPickerOpen && (
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
            Available Seed Images (Click to toggle):
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {HOST_SEED_PROPERTY_GALLERY.map((optUrl) => {
              const isSelected = images.includes(optUrl);
              return (
                <button
                  key={optUrl}
                  type="button"
                  onClick={() => photos.toggleImage(optUrl)}
                  className={cn(
                    'relative aspect-4/3 rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                    isSelected
                      ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20'
                      : 'border-transparent opacity-75 hover:opacity-100',
                  )}
                >
                  <Image src={optUrl} alt="Gallery preview" fill sizes="15vw" className="object-cover" unoptimized />
                  {isSelected && (
                    <div className="absolute top-1 right-1 p-0.5 rounded-full bg-[var(--color-brand)] text-white">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={photos.urlDraft}
            onChange={(e) => photos.setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                photos.addUrlDraft();
              }
            }}
            data-testid="host-custom-photo-input"
            aria-label="Image URL or path"
            aria-invalid={Boolean(imageError)}
            placeholder="Or add photo URL: /uploads/..., /seed/..., or https://..."
            className={cn(
              'flex-1 min-h-10 px-3.5 py-2 rounded-lg border text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none',
              imageError ? 'border-rose-400 focus:border-rose-500' : 'border-neutral-300 focus:border-[var(--color-brand)]',
            )}
          />
          <button
            type="button"
            onClick={photos.addUrlDraft}
            data-testid="host-add-photo-btn"
            className="min-h-10 px-3.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Add Photo
          </button>
        </div>
        {imageError && (
          <p role="alert" data-testid="host-image-error" className="text-xs text-rose-600 mt-1.5">
            {imageError}
          </p>
        )}
      </div>
    </section>
  );
}
