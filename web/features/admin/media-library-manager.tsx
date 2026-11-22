'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Images, Loader2, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaUploadCard } from '@/features/admin/media/media-upload-card';
import { MediaAssetCard } from '@/features/admin/media/media-asset-card';
import type { MediaItem, MediaListResult } from '@/lib/types/media';

const MAX_CLIENT_UPLOAD_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 24;

export function MediaLibraryManager() {
  const altInputId = useId();
  const searchInputId = useId();

  // Upload state
  const [uploadAlt, setUploadAlt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(
    null,
  );

  // Library list state
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(() => new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Guards for unmount safety, double-submit prevention, and timers
  const isMountedRef = useRef(true);
  const isUploadingRef = useRef(false);
  const deletingIdsRef = useRef<Set<number>>(new Set());
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Debounce search input and reset pagination to page 1 on term change
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedSearch) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const currentQueryKey = `${page}::${debouncedSearch}::${refreshNonce}`;
  const isLoading = settledQueryKey !== currentQueryKey;

  // Fetch paginated media records from the server
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadMedia = async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch.length > 0) {
        params.set('search', debouncedSearch);
      }

      try {
        const response = await fetch(`/api/media?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });

        const data = (await response.json().catch(() => null)) as
          | MediaListResult
          | { error?: string }
          | null;

        if (cancelled) return;

        if (!response.ok || !data || !('items' in data)) {
          const message =
            data && 'error' in data && typeof data.error === 'string'
              ? data.error
              : 'Failed to load media library.';
          setLibraryError(message);
          setSettledQueryKey(currentQueryKey);
          return;
        }

        const safeTotalPages = Math.max(1, data.totalPages);
        if (data.total > 0 && page > safeTotalPages) {
          setPage(safeTotalPages);
          return;
        }

        setLibraryError(null);
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(safeTotalPages);
        setSettledQueryKey(currentQueryKey);
      } catch (error: unknown) {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLibraryError('Network error while loading media library.');
        setSettledQueryKey(currentQueryKey);
      }
    };

    void loadMedia();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, debouncedSearch, currentQueryKey]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isUploadingRef.current) return;

      isUploadingRef.current = true;
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccessMessage(null);

      let uploadedCount = 0;
      let firstError: string | null = null;

      try {
        for (const file of files) {
          if (file.size === 0) {
            firstError ??= 'Uploaded file is empty.';
            continue;
          }
          if (file.size > MAX_CLIENT_UPLOAD_BYTES) {
            firstError ??= 'File exceeds maximum allowed size of 5 MB.';
            continue;
          }

          const formData = new FormData();
          formData.append('file', file);
          const trimmedAlt = uploadAlt.trim();
          if (trimmedAlt.length > 0) {
            formData.append('alt', trimmedAlt);
          }

          let response: Response;
          try {
            response = await fetch('/api/uploads', {
              method: 'POST',
              body: formData,
            });
          } catch {
            firstError ??=
              'Network error while uploading image. Please try again.';
            continue;
          }

          const payload = (await response.json().catch(() => null)) as
            | { media?: MediaItem; error?: string }
            | null;

          if (!response.ok || !payload?.media) {
            firstError ??=
              payload?.error ||
              'Failed to upload image. Please check the file and try again.';
            continue;
          }

          uploadedCount += 1;
        }

        if (!isMountedRef.current) return;

        if (firstError) {
          setUploadError(firstError);
        }

        if (uploadedCount > 0) {
          setUploadSuccessMessage(
            `${uploadedCount} ${uploadedCount === 1 ? 'image' : 'images'} uploaded and converted to WebP.`,
          );
          setUploadAlt('');
          setPage(1);
          setRefreshNonce((n) => n + 1);
        }
      } finally {
        isUploadingRef.current = false;
        if (isMountedRef.current) {
          setIsUploading(false);
        }
      }
    },
    [uploadAlt],
  );

  // Support pasting images directly from clipboard anywhere on the manager page
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems || clipboardItems.length === 0) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(clipboardItems)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        void handleUploadFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleUploadFiles]);

  const handleCopyUrl = async (item: MediaItem) => {
    setActionError(null);
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(item.url);
      if (!isMountedRef.current) return;
      setCopiedId(item.id);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          setCopiedId((current) => (current === item.id ? null : current));
        }
      }, 2000);
    } catch {
      if (isMountedRef.current) {
        setActionError(`Unable to copy automatically. Copy manually: ${item.url}`);
      }
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    if (item.isInUse || deletingIdsRef.current.has(item.id)) return;

    deletingIdsRef.current.add(item.id);
    setDeletingIds(new Set(deletingIdsRef.current));
    setActionError(null);

    try {
      const response = await fetch(`/api/media/${item.id}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!isMountedRef.current) return;

      if (!response.ok) {
        setActionError(payload?.error || 'Failed to delete media item.');
        // Refresh usage badges if the asset became referenced in another tab
        if (response.status === 409) {
          setRefreshNonce((n) => n + 1);
        }
        return;
      }

      // Re-fetch authoritative count and pagination after deletion
      if (items.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        setRefreshNonce((n) => n + 1);
      }
    } catch {
      if (isMountedRef.current) {
        setActionError('Network error while deleting media item.');
      }
    } finally {
      deletingIdsRef.current.delete(item.id);
      if (isMountedRef.current) {
        setDeletingIds(new Set(deletingIdsRef.current));
      }
    }
  };

  return (
    <div className="space-y-6" data-testid="media-manager">
      <MediaUploadCard
        altInputId={altInputId}
        alt={uploadAlt}
        onAltChange={setUploadAlt}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        isUploading={isUploading}
        error={uploadError}
        successMessage={uploadSuccessMessage}
        onFiles={handleUploadFiles}
      />

      {/* Media Library Grid Card */}
      <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] p-5 sm:p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-on-light-muted)]"
            />
            <label htmlFor={searchInputId} className="sr-only">
              Search media files
            </label>
            <input
              id={searchInputId}
              type="search"
              data-testid="media-search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by alt text or filename..."
              className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] pl-9 pr-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-xs font-medium text-[var(--color-text-on-light-muted)]">
              {total} {total === 1 ? 'asset' : 'assets'}
            </span>
            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={isLoading}
              aria-label="Refresh media library"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div
            role="alert"
            data-testid="media-action-error"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="break-words">{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="shrink-0 font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {libraryError && (
          <div
            role="alert"
            data-testid="media-library-error"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="break-words">{libraryError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLibraryError(null);
                setRefreshNonce((n) => n + 1);
              }}
              className="shrink-0 font-semibold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-[var(--color-text-on-light-muted)]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
            <p className="text-xs">Loading media library...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-light)] py-14 px-4 text-center">
            <Images className="h-9 w-9 text-[var(--color-text-light-subtle)] mb-2" />
            <p className="text-sm font-semibold text-[var(--color-text-on-light)]">
              {debouncedSearch
                ? 'No media matched your search.'
                : 'No uploaded media yet.'}
            </p>
            <p className="text-xs text-[var(--color-text-on-light-muted)] mt-1 max-w-md">
              {debouncedSearch
                ? 'Try a different keyword or clear the search filter.'
                : 'Upload your first image above to build your reusable media library.'}
            </p>
            {debouncedSearch && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <MediaAssetCard
                key={item.id}
                item={item}
                isDeleting={deletingIds.has(item.id)}
                isCopied={copiedId === item.id}
                onCopy={() => void handleCopyUrl(item)}
                onDelete={() => void handleDeleteMedia(item)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-[var(--color-border-light)]">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
