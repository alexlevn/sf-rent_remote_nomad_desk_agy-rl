'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Images, Link as LinkIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/lib/types/media';
import { isSafeImagePath } from '@/lib/validations/media';
import { useMediaUpload } from '@/features/media/media-library/use-media-upload';
import { useMediaLibrary } from '@/features/media/media-library/use-media-library';
import { UploadPanel } from '@/features/media/media-library/upload-panel';
import { LibraryPanel } from '@/features/media/media-library/library-panel';
import { UrlPanel, type UrlDraft } from '@/features/media/media-library/url-panel';

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

const ALL_TABS: ReadonlyArray<{ id: MediaLibraryTab; label: string; testId: string }> = [
  { id: 'upload', label: 'Upload', testId: 'media-tab-upload' },
  { id: 'library', label: 'Media Library', testId: 'media-tab-library' },
  { id: 'url', label: 'From URL', testId: 'media-tab-url' },
];

function resolveInitialTab(initialTab: MediaLibraryTab, allowUrlTab: boolean): MediaLibraryTab {
  if (initialTab === 'url' && !allowUrlTab) return 'upload';
  return initialTab;
}

function toSelected(item: MediaItem): SelectedMediaItem {
  return { url: item.url, alt: item.alt ?? undefined };
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

  const [activeTab, setActiveTab] = useState<MediaLibraryTab>(() => resolveInitialTab(initialTab, allowUrlTab));
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectedMediaItem>>(() => new Map());
  const [urlDraft, setUrlDraft] = useState<UrlDraft>({ url: '', alt: '' });
  const [urlError, setUrlError] = useState<string | null>(null);

  // Refs for unmount safety and keyboard focus
  const isMountedRef = useRef(true);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<MediaLibraryTab, HTMLButtonElement | null>>({
    upload: null,
    library: null,
    url: null,
  });

  useEffect(() => {
    isMountedRef.current = true;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      isMountedRef.current = false;
      previouslyFocused?.focus?.();
    };
  }, []);

  const tabs = allowUrlTab ? ALL_TABS : ALL_TABS.filter((tab) => tab.id !== 'url');

  const library = useMediaLibrary({
    isActive: activeTab === 'library',
    isMountedRef,
    onDeleted: (item) =>
      setSelectedMap((prev) => {
        if (!prev.has(item.url)) return prev;
        const next = new Map(prev);
        next.delete(item.url);
        return next;
      }),
  });
  const refreshLibrary = library.refresh;

  const handleUploaded = useCallback(
    (items: MediaItem[], alt: string): boolean => {
      if (!multiple) {
        const single = items[0];
        onSelect([{ url: single.url, alt: single.alt ?? (alt || undefined) }]);
        onClose();
        return true;
      }
      setSelectedMap((prev) => {
        const next = new Map(prev);
        for (const item of items) next.set(item.url, toSelected(item));
        return next;
      });
      refreshLibrary();
      return false;
    },
    [multiple, onClose, onSelect, refreshLibrary]
  );

  const upload = useMediaUpload({
    multiple,
    isActive: activeTab === 'upload',
    isMountedRef,
    onUploaded: handleUploaded,
  });

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

  const handleToggleSelectItem = (item: MediaItem) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.url)) {
        next.delete(item.url);
      } else {
        if (!multiple) next.clear();
        next.set(item.url, toSelected(item));
      }
      return next;
    });
  };

  const handleConfirmSelected = () => {
    const items = Array.from(selectedMap.values());
    if (items.length === 0) return;
    onSelect(items);
    onClose();
  };

  const handleUrlDraftChange = (draft: UrlDraft) => {
    if (draft.url !== urlDraft.url && urlError) setUrlError(null);
    setUrlDraft(draft);
  };

  const handleInsertUrl = () => {
    const trimmedUrl = urlDraft.url.trim();
    if (!isSafeImagePath(trimmedUrl)) {
      setUrlError('Enter a valid /uploads/..., /seed/..., or https:// image URL.');
      return;
    }

    const trimmedAlt = urlDraft.alt.trim();
    const insertedItem: SelectedMediaItem = { url: trimmedUrl, alt: trimmedAlt.length > 0 ? trimmedAlt : undefined };

    if (multiple && selectedMap.size > 0) {
      const merged = new Map(selectedMap);
      merged.set(insertedItem.url, insertedItem);
      onSelect(Array.from(merged.values()));
    } else {
      onSelect([insertedItem]);
    }
    onClose();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const targetTab = tabs[nextIndex];
      setActiveTab(targetTab.id);
      tabRefs.current[targetTab.id]?.focus();
    }
  };

  const selectedCount = selectedMap.size;
  const panelProps = (tab: MediaLibraryTab) => ({
    role: 'tabpanel',
    id: `${titleId}-panel-${tab}`,
    'aria-labelledby': `${titleId}-tab-${tab}`,
  });

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
          {activeTab === 'upload' && (
            <div {...panelProps('upload')}>
              <UploadPanel
                upload={upload}
                multiple={multiple}
                altInputId={uploadAltId}
                onViewLibrary={() => setActiveTab('library')}
              />
            </div>
          )}

          {activeTab === 'library' && (
            <div {...panelProps('library')}>
              <LibraryPanel
                library={library}
                searchInputId={searchInputId}
                selectedUrls={selectedMap}
                onToggleSelect={handleToggleSelectItem}
                onGoToUpload={() => setActiveTab('upload')}
              />
            </div>
          )}

          {allowUrlTab && activeTab === 'url' && (
            <div {...panelProps('url')}>
              <UrlPanel
                draft={urlDraft}
                onDraftChange={handleUrlDraftChange}
                error={urlError}
                urlInputId={urlInputId}
                altInputId={urlAltId}
                onInsert={handleInsertUrl}
                onCancel={onClose}
              />
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

export function MediaLibraryModal({ isOpen, ...rest }: MediaLibraryModalProps) {
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(<MediaLibraryModalContent {...rest} />, document.body);
}
