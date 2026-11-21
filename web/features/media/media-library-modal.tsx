'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Link as LinkIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaItem, MediaListResult } from '@/lib/types/media';
import { isSafeImagePath } from '@/lib/validations/media';

const MAX_CLIENT_UPLOAD_BYTES = 5 * 1024 * 1024;
const LIBRARY_PAGE_SIZE = 12;

export interface SelectedMediaItem {
  url: string;
  alt?: string;
}

export type MediaLibraryTab = 'upload' | 'library' | 'url';

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: SelectedMediaItem[]) => void;
  multiple?: boolean;
  allowUrlTab?: boolean;
  initialTab?: MediaLibraryTab;
  title?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function resolveInitialTab(
  initialTab: MediaLibraryTab,
  allowUrlTab: boolean,
): MediaLibraryTab {
  if (initialTab === 'url' && !allowUrlTab) return 'upload';
  return initialTab;
}

type MediaLibraryModalContentProps = Omit<MediaLibraryModalProps, 'isOpen'>;

function MediaLibraryModalContent({
  onClose,
  onSelect,
  multiple = false,
  allowUrlTab = true,
  initialTab = 'upload',
  title = 'Media Library',
}: MediaLibraryModalContentProps) {
  const titleId = useId();
  const uploadAltId = useId();
  const urlInputId = useId();
  const urlAltId = useId();
  const searchInputId = useId();

  const [activeTab, setActiveTab] = useState<MediaLibraryTab>(() =>
    resolveInitialTab(initialTab, allowUrlTab),
  );

  // Upload tab state
  const [uploadAlt, setUploadAlt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);

  // Library tab state
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryTotalPages, setLibraryTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(() => new Set());
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectedMediaItem>>(
    () => new Map(),
  );

  // URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [urlAlt, setUrlAlt] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [failedUrlPreview, setFailedUrlPreview] = useState<string | null>(null);

  // Refs for unmount safety, double-submit guards, and keyboard focus
  const isMountedRef = useRef(true);
  const isUploadingRef = useRef(false);
  const deletingIdsRef = useRef<Set<number>>(new Set());
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Record<MediaLibraryTab, HTMLButtonElement | null>>({
    upload: null,
    library: null,
    url: null,
  });

  useEffect(() => {
    isMountedRef.current = true;
    dialogRef.current?.focus();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const tabs: Array<{
    id: MediaLibraryTab;
    label: string;
    testId: string;
  }> = allowUrlTab
    ? [
        { id: 'upload', label: 'Upload', testId: 'media-tab-upload' },
        { id: 'library', label: 'Media Library', testId: 'media-tab-library' },
        { id: 'url', label: 'From URL', testId: 'media-tab-url' },
      ]
    : [
        { id: 'upload', label: 'Upload', testId: 'media-tab-upload' },
        { id: 'library', label: 'Media Library', testId: 'media-tab-library' },
      ];

  // Debounce library search input and reset to page 1 when the term changes
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedSearch) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmed);
      setLibraryPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const currentQueryKey = `${libraryPage}::${debouncedSearch}::${refreshNonce}`;
  const isLoadingLibrary =
    activeTab === 'library' && settledQueryKey !== currentQueryKey;

  // Fetch paginated media list when Library tab is active or query changes
  useEffect(() => {
    if (activeTab !== 'library') return;

    const controller = new AbortController();
    let cancelled = false;

    const params = new URLSearchParams({
      page: String(libraryPage),
      pageSize: String(LIBRARY_PAGE_SIZE),
    });
    if (debouncedSearch.length > 0) {
      params.set('search', debouncedSearch);
    }

    fetch(`/api/media?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
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
        if (data.total > 0 && libraryPage > safeTotalPages) {
          setLibraryPage(safeTotalPages);
          return;
        }

        setLibraryError(null);
        setLibraryItems(data.items);
        setLibraryTotal(data.total);
        setLibraryTotalPages(safeTotalPages);
        setSettledQueryKey(currentQueryKey);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLibraryError('Network error while loading media library.');
        setSettledQueryKey(currentQueryKey);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeTab, libraryPage, debouncedSearch, currentQueryKey]);

  // Lock body scroll and close only this modal on Escape (capture phase)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isUploadingRef.current) return;

      const queue = multiple ? files : [files[0]];
      isUploadingRef.current = true;
      setIsUploading(true);
      setUploadError(null);

      const uploadedItems: MediaItem[] = [];
      let firstError: string | null = null;

      try {
        for (const file of queue) {
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

          uploadedItems.push(payload.media);
        }

        // Ignore late completion if user closed the modal mid-upload
        if (!isMountedRef.current) return;

        if (firstError) {
          setUploadError(firstError);
        }

        if (uploadedItems.length > 0) {
          if (!multiple) {
            const single = uploadedItems[0];
            onSelect([
              {
                url: single.url,
                alt: single.alt ?? (uploadAlt.trim() || undefined),
              },
            ]);
            onClose();
            return;
          }

          setSelectedMap((prev) => {
            const next = new Map(prev);
            for (const item of uploadedItems) {
              next.set(item.url, {
                url: item.url,
                alt: item.alt ?? undefined,
              });
            }
            return next;
          });
          setUploadSuccessCount((prev) => prev + uploadedItems.length);
          setRefreshNonce((n) => n + 1);
        }
      } finally {
        isUploadingRef.current = false;
        if (isMountedRef.current) {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    },
    [multiple, onClose, onSelect, uploadAlt],
  );

  // Clipboard paste support while Upload tab is open
  useEffect(() => {
    if (activeTab !== 'upload') return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
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
  }, [activeTab, handleUploadFiles]);

  const handleToggleSelectItem = (item: MediaItem) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.url)) {
        next.delete(item.url);
      } else {
        if (!multiple) {
          next.clear();
        }
        next.set(item.url, {
          url: item.url,
          alt: item.alt ?? undefined,
        });
      }
      return next;
    });
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    if (item.isInUse || deletingIdsRef.current.has(item.id)) return;

    deletingIdsRef.current.add(item.id);
    setDeletingIds(new Set(deletingIdsRef.current));
    setLibraryError(null);

    try {
      const response = await fetch(`/api/media/${item.id}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!isMountedRef.current) return;

      if (!response.ok) {
        setLibraryError(payload?.error || 'Failed to delete media item.');
        return;
      }

      setSelectedMap((prev) => {
        if (!prev.has(item.url)) return prev;
        const next = new Map(prev);
        next.delete(item.url);
        return next;
      });

      // Re-fetch from server so counts and pagination stay authoritative
      if (libraryItems.length === 1 && libraryPage > 1) {
        setLibraryPage((p) => Math.max(1, p - 1));
      } else {
        setRefreshNonce((n) => n + 1);
      }
    } catch {
      if (isMountedRef.current) {
        setLibraryError('Network error while deleting media item.');
      }
    } finally {
      deletingIdsRef.current.delete(item.id);
      if (isMountedRef.current) {
        setDeletingIds(new Set(deletingIdsRef.current));
      }
    }
  };

  const handleConfirmSelected = () => {
    const items = Array.from(selectedMap.values());
    if (items.length === 0) return;
    onSelect(items);
    onClose();
  };

  const handleInsertUrl = () => {
    const trimmedUrl = urlInput.trim();
    if (!isSafeImagePath(trimmedUrl)) {
      setUrlError(
        'Enter a valid /uploads/..., /seed/..., or https:// image URL.',
      );
      return;
    }

    const trimmedAlt = urlAlt.trim();
    onSelect([
      {
        url: trimmedUrl,
        alt: trimmedAlt.length > 0 ? trimmedAlt : undefined,
      },
    ]);
    onClose();
  };

  const handleUrlInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleInsertUrl();
    }
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const targetTab = tabs[nextIndex];
      setActiveTab(targetTab.id);
      tabRefs.current[targetTab.id]?.focus();
    }
  };

  const selectedCount = selectedMap.size;
  const trimmedUrlPreview = urlInput.trim();
  const canPreviewUrl =
    isSafeImagePath(trimmedUrlPreview) && failedUrlPreview !== trimmedUrlPreview;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="media-library-modal"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light)] shadow-2xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border-light)] px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-on-light)] truncate"
            >
              {title}
            </h2>
            <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
              {multiple
                ? 'Upload new images or select one or more from your library.'
                : 'Upload an image, choose from the library, or insert by URL.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-full text-[var(--color-text-on-light-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-on-light)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Media source tabs"
          className="flex items-center gap-1 border-b border-[var(--color-border-light)] bg-[var(--color-bg-light-alt)] px-4 pt-2 sm:px-6 overflow-x-auto"
        >
          {tabs.map((tab, index) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${titleId}-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`${titleId}-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                data-testid={tab.testId}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  'flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3.5 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]',
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-bg-light-surface)] text-[var(--color-brand)]'
                    : 'border-transparent text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)]',
                )}
              >
                {tab.id === 'upload' && <Upload className="h-4 w-4" />}
                {tab.id === 'library' && <Images className="h-4 w-4" />}
                {tab.id === 'url' && <LinkIcon className="h-4 w-4" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div
              role="tabpanel"
              id={`${titleId}-panel-upload`}
              aria-labelledby={`${titleId}-tab-upload`}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor={uploadAltId}
                  className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
                >
                  Alt text (optional)
                </label>
                <input
                  id={uploadAltId}
                  type="text"
                  value={uploadAlt}
                  maxLength={255}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="Describe the image for accessibility (e.g. Sunlit living room with desk)"
                  className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isDragging) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = Array.from(e.dataTransfer.files);
                  if (dropped.length > 0) {
                    void handleUploadFiles(dropped);
                  }
                }}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                  isDragging
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                    : 'border-[var(--color-border-light)] bg-[var(--color-bg-light)]',
                )}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand)]" />
                    <p className="text-sm font-medium text-[var(--color-text-on-light)]">
                      Uploading and optimizing image...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-text-on-light)]">
                      Drag and drop {multiple ? 'images' : 'an image'} here, or
                      paste from clipboard
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-on-light-muted)]">
                      JPEG, PNG, WebP, or static GIF up to 5 MB. Converted
                      automatically to WebP.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple={multiple}
                      data-testid="media-file-input"
                      onChange={(e) => {
                        const chosen = e.target.files
                          ? Array.from(e.target.files)
                          : [];
                        if (chosen.length > 0) {
                          void handleUploadFiles(chosen);
                        }
                      }}
                      className="sr-only"
                      aria-label="Choose image file to upload"
                    />

                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Select {multiple ? 'Files' : 'File'}</span>
                    </button>
                  </>
                )}
              </div>

              {uploadError && (
                <div
                  role="alert"
                  data-testid="media-upload-error"
                  className="flex items-start gap-2 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {multiple && uploadSuccessCount > 0 && (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3.5 py-2.5 text-xs text-[var(--color-success)]"
                >
                  <span>
                    {uploadSuccessCount}{' '}
                    {uploadSuccessCount === 1 ? 'image' : 'images'} uploaded and
                    added to your selection.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="font-semibold underline cursor-pointer"
                  >
                    View in Media Library
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEDIA LIBRARY */}
          {activeTab === 'library' && (
            <div
              role="tabpanel"
              id={`${titleId}-panel-library`}
              aria-labelledby={`${titleId}-tab-library`}
              className="space-y-4"
            >
              {/* Search bar */}
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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by alt text or filename..."
                    className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] pl-9 pr-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <span className="text-xs text-[var(--color-text-on-light-muted)] whitespace-nowrap">
                  {libraryTotal} {libraryTotal === 1 ? 'item' : 'items'}
                </span>
              </div>

              {libraryError && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{libraryError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefreshNonce((n) => n + 1)}
                    className="shrink-0 font-semibold underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {isLoadingLibrary ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--color-text-on-light-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
                  <p className="text-xs">Loading media library...</p>
                </div>
              ) : libraryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-light)] py-12 px-4 text-center">
                  <Images className="h-8 w-8 text-[var(--color-text-light-subtle)] mb-2" />
                  <p className="text-sm font-medium text-[var(--color-text-on-light)]">
                    {debouncedSearch
                      ? 'No media matched your search.'
                      : 'Your media library is empty.'}
                  </p>
                  <p className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
                    {debouncedSearch
                      ? 'Try a different search term or clear the filter.'
                      : 'Upload an image to reuse it across properties, guides, and posts.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (debouncedSearch) {
                        setSearchInput('');
                      } else {
                        setActiveTab('upload');
                      }
                    }}
                    className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                  >
                    {debouncedSearch ? 'Clear Search' : 'Upload an Image'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                  {libraryItems.map((item) => {
                    const isSelected = selectedMap.has(item.url);
                    const isDeleting = deletingIds.has(item.id);
                    return (
                      <div
                        key={item.id}
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
                          onClick={() => handleToggleSelectItem(item)}
                          aria-pressed={isSelected}
                          className="group relative aspect-4/3 w-full overflow-hidden bg-[var(--color-surface-muted)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                        >
                          <Image
                            src={item.url}
                            alt={item.alt || item.storageKey}
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
                            <p
                              className="truncate text-xs font-medium text-[var(--color-text-on-light)]"
                              title={item.alt || item.storageKey}
                            >
                              {item.alt || item.storageKey}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-on-light-muted)]">
                              {item.width}×{item.height} ·{' '}
                              {formatFileSize(item.sizeBytes)}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={item.isInUse || isDeleting}
                            aria-label="Delete media"
                            title={
                              item.isInUse
                                ? 'Cannot delete an image currently in use'
                                : 'Delete unused image'
                            }
                            data-testid={`media-delete-${item.id}`}
                            onClick={() => void handleDeleteMedia(item)}
                            className={cn(
                              'flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                              item.isInUse
                                ? 'border-transparent text-[var(--color-text-light-subtle)] opacity-40 cursor-not-allowed'
                                : 'border-[var(--color-border-light)] text-[var(--color-text-on-light-muted)] hover:border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] cursor-pointer',
                            )}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {libraryTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-light)]">
                  <button
                    type="button"
                    disabled={libraryPage <= 1 || isLoadingLibrary}
                    onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-[var(--color-text-on-light-muted)]">
                    Page {libraryPage} of {libraryTotalPages}
                  </span>

                  <button
                    type="button"
                    disabled={libraryPage >= libraryTotalPages || isLoadingLibrary}
                    onClick={() =>
                      setLibraryPage((p) => Math.min(libraryTotalPages, p + 1))
                    }
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FROM URL (div instead of <form> because modal can mount inside a parent form) */}
          {allowUrlTab && activeTab === 'url' && (
            <div
              role="tabpanel"
              id={`${titleId}-panel-url`}
              aria-labelledby={`${titleId}-tab-url`}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor={urlInputId}
                  className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
                >
                  Image URL / Path
                </label>
                <input
                  id={urlInputId}
                  type="text"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  onKeyDown={handleUrlInputKeyDown}
                  placeholder="/seed/guide/placeholder.webp, /uploads/..., or https://..."
                  className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
                <p className="mt-1 text-xs text-[var(--color-text-on-light-muted)]">
                  Accepts local <code className="font-mono">/uploads/...</code>,{' '}
                  <code className="font-mono">/seed/...</code>, or{' '}
                  <code className="font-mono">https://</code> URLs.
                </p>
              </div>

              <div>
                <label
                  htmlFor={urlAltId}
                  className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
                >
                  Alt text (optional)
                </label>
                <input
                  id={urlAltId}
                  type="text"
                  value={urlAlt}
                  maxLength={255}
                  onChange={(e) => setUrlAlt(e.target.value)}
                  onKeyDown={handleUrlInputKeyDown}
                  placeholder="Describe the image for accessibility"
                  className="w-full min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                />
              </div>

              {canPreviewUrl && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-[var(--color-text-on-light-muted)]">
                    Preview
                  </span>
                  <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
                    <Image
                      src={trimmedUrlPreview}
                      alt={urlAlt.trim() || 'URL image preview'}
                      fill
                      unoptimized
                      sizes="320px"
                      className="object-cover"
                      onError={() => setFailedUrlPreview(trimmedUrlPreview)}
                    />
                  </div>
                </div>
              )}

              {urlError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{urlError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="media-url-insert-btn"
                  onClick={handleInsertUrl}
                  className="min-h-10 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
                >
                  Insert Image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Shared Selection Footer (shown for Library tab or when items are selected in multiple mode) */}
        {(activeTab === 'library' || (multiple && selectedCount > 0)) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] bg-[var(--color-bg-light-alt)] px-4 py-3 sm:px-6">
            <span className="text-xs font-medium text-[var(--color-text-on-light-muted)]">
              {selectedCount > 0
                ? `${selectedCount} ${selectedCount === 1 ? 'image' : 'images'} selected`
                : 'Select an image to insert'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-4 py-2 text-xs sm:text-sm font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                data-testid="media-confirm-select"
                onClick={handleConfirmSelected}
                className="min-h-10 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Insert Selected
                {selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaLibraryModal({
  isOpen,
  ...rest
}: MediaLibraryModalProps) {
  if (!isOpen) return null;
  return <MediaLibraryModalContent {...rest} />;
}
