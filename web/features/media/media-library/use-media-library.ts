'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaItem, MediaListResult } from '@/lib/types/media';

const LIBRARY_PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 250;

export interface MediaLibraryController {
  items: MediaItem[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  total: number;
  totalPages: number;
  searchInput: string;
  setSearchInput: (value: string) => void;
  debouncedSearch: string;
  isLoading: boolean;
  error: string | null;
  deletingIds: Set<number>;
  refresh: () => void;
  deleteMedia: (item: MediaItem) => Promise<void>;
}

interface UseMediaLibraryOptions {
  isActive: boolean;
  isMountedRef: React.RefObject<boolean>;
  onDeleted: (item: MediaItem) => void;
}

export function useMediaLibrary({ isActive, isMountedRef, onDeleted }: UseMediaLibraryOptions): MediaLibraryController {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(() => new Set());
  const deletingIdsRef = useRef<Set<number>>(new Set());

  const refresh = () => setRefreshNonce((n) => n + 1);

  // Debounce library search input and reset to page 1 when the term changes
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedSearch) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const currentQueryKey = `${page}::${debouncedSearch}::${refreshNonce}`;
  const isLoading = isActive && settledQueryKey !== currentQueryKey;

  // Fetch paginated media list when Library tab is active or query changes
  useEffect(() => {
    if (!isActive) return;

    const controller = new AbortController();
    let cancelled = false;

    const loadLibrary = async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(LIBRARY_PAGE_SIZE) });
      if (debouncedSearch.length > 0) params.set('search', debouncedSearch);

      try {
        const response = await fetch(`/api/media?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });

        const data = (await response.json().catch(() => null)) as MediaListResult | { error?: string } | null;

        if (cancelled) return;

        if (!response.ok || !data || !('items' in data)) {
          const message =
            data && 'error' in data && typeof data.error === 'string' ? data.error : 'Failed to load media library.';
          setError(message);
          setSettledQueryKey(currentQueryKey);
          return;
        }

        const safeTotalPages = Math.max(1, data.totalPages);
        if (data.total > 0 && page > safeTotalPages) {
          setPage(safeTotalPages);
          return;
        }

        setError(null);
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(safeTotalPages);
        setSettledQueryKey(currentQueryKey);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Network error while loading media library.');
        setSettledQueryKey(currentQueryKey);
      }
    };

    void loadLibrary();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isActive, page, debouncedSearch, currentQueryKey]);

  const deleteMedia = async (item: MediaItem) => {
    if (item.isInUse || deletingIdsRef.current.has(item.id)) return;

    deletingIdsRef.current.add(item.id);
    setDeletingIds(new Set(deletingIdsRef.current));
    setError(null);

    try {
      const response = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!isMountedRef.current) return;

      if (!response.ok) {
        setError(payload?.error || 'Failed to delete media item.');
        if (response.status === 409) refresh();
        return;
      }

      onDeleted(item);

      // Re-fetch from server so counts and pagination stay authoritative
      if (items.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        refresh();
      }
    } catch {
      if (isMountedRef.current) setError('Network error while deleting media item.');
    } finally {
      deletingIdsRef.current.delete(item.id);
      if (isMountedRef.current) setDeletingIds(new Set(deletingIdsRef.current));
    }
  };

  return {
    items,
    page,
    setPage,
    total,
    totalPages,
    searchInput,
    setSearchInput,
    debouncedSearch,
    isLoading,
    error,
    deletingIds,
    refresh,
    deleteMedia,
  };
}
