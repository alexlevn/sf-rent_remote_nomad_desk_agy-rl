'use client';

import React from 'react';
import Image from 'next/image';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Images, Loader2, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/format';
import type { MediaItem } from '@/lib/types/media';
import type { MediaLibraryController } from './use-media-library';
import { ERROR_BOX_CLASS, PAGER_BTN_CLASS } from './styles';

interface MediaTileProps {
  item: MediaItem;
  isSelected: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function MediaTile({ item, isSelected, isDeleting, onToggle, onDelete }: MediaTileProps) {
  const label = item.alt || item.storageKey;
  return (
    <div
      data-testid={`media-item-${item.id}`}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-[var(--color-bg-light-surface)] transition-all',
        isSelected
          ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]'
          : 'border-[var(--color-border-light)] hover:border-[var(--color-text-light-subtle)]',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSelected}
        className="group relative aspect-4/3 w-full overflow-hidden bg-[var(--color-surface-muted)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
      >
        <Image
          src={item.url}
          alt={label}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
        />

        {isSelected && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-brand-text)] shadow-sm">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}

        {item.isInUse && (
          <span
            title={`Used in ${item.usageCount} ${item.usageCount === 1 ? 'place' : 'places'}`}
            className="absolute left-2 top-2 rounded-full border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-info)]"
          >
            In use
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 p-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--color-text-on-light)]" title={label}>
            {label}
          </p>
          <p className="text-[11px] text-[var(--color-text-on-light-muted)]">
            {item.width}×{item.height} · {formatFileSize(item.sizeBytes)}
          </p>
        </div>

        <button
          type="button"
          disabled={item.isInUse || isDeleting}
          aria-label="Delete media"
          title={item.isInUse ? 'Cannot delete an image currently in use' : 'Delete unused image'}
          data-testid={`media-delete-${item.id}`}
          onClick={onDelete}
          className={cn(
            'flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
            item.isInUse
              ? 'border-transparent text-[var(--color-text-light-subtle)] opacity-40 cursor-not-allowed'
              : 'border-[var(--color-border-light)] text-[var(--color-text-on-light-muted)] hover:border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] cursor-pointer',
          )}
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface LibraryPanelProps {
  library: MediaLibraryController;
  searchInputId: string;
  selectedUrls: ReadonlyMap<string, unknown>;
  onToggleSelect: (item: MediaItem) => void;
  onGoToUpload: () => void;
}

export function LibraryPanel({ library, searchInputId, selectedUrls, onToggleSelect, onGoToUpload }: LibraryPanelProps) {
  const { items, isLoading, debouncedSearch, page, totalPages, total } = library;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-on-light-muted)]"
          />
          <label htmlFor={searchInputId} className="sr-only">
            Search media library
          </label>
          <input
            id={searchInputId}
            type="search"
            value={library.searchInput}
            onChange={(e) => library.setSearchInput(e.target.value)}
            placeholder="Search by alt text or filename..."
            className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] pl-9 pr-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          />
        </div>
        <span className="text-xs text-[var(--color-text-on-light-muted)] whitespace-nowrap">
          {total} {total === 1 ? 'item' : 'items'}
        </span>
      </div>

      {library.error && (
        <div role="alert" className={cn('flex items-center justify-between gap-3', ERROR_BOX_CLASS)}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{library.error}</span>
          </div>
          <button type="button" onClick={library.refresh} className="shrink-0 font-semibold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--color-text-on-light-muted)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
          <p className="text-xs">Loading media library...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-light)] py-12 px-4 text-center">
          <Images className="h-8 w-8 text-[var(--color-text-light-subtle)] mb-2" />
          <p className="text-sm font-medium text-[var(--color-text-on-light)]">
            {debouncedSearch ? 'No media matched your search.' : 'Your media library is empty.'}
          </p>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
            {debouncedSearch
              ? 'Try a different search term or clear the filter.'
              : 'Upload an image to reuse it across properties, guides, and posts.'}
          </p>
          <button
            type="button"
            onClick={() => (debouncedSearch ? library.setSearchInput('') : onGoToUpload())}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
          >
            {debouncedSearch ? 'Clear Search' : 'Upload an Image'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
          {items.map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              isSelected={selectedUrls.has(item.url)}
              isDeleting={library.deletingIds.has(item.id)}
              onToggle={() => onToggleSelect(item)}
              onDelete={() => void library.deleteMedia(item)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-light)]">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => library.setPage((p) => Math.max(1, p - 1))}
            className={PAGER_BTN_CLASS}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-[var(--color-text-on-light-muted)]">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => library.setPage((p) => Math.min(totalPages, p + 1))}
            className={PAGER_BTN_CLASS}
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
