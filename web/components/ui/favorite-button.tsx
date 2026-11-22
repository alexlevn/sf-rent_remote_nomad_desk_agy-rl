'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getUserFavoriteIdsAction,
  toggleFavoriteAction,
} from '@/app/guests/favorites/actions';

const STORAGE_KEY = 'nomaddesk_favorites';

interface FavoriteButtonProps {
  propertyId: number;
  propertyTitle?: string;
  variant?: 'icon' | 'pill';
  className?: string;
}

function readLocalFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  propertyId,
  propertyTitle = 'apartment',
  variant = 'pill',
  className,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const isTogglingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const syncState = async () => {
      const localIds = readLocalFavoriteIds();
      if (active) {
        setIsFavorite(localIds.includes(propertyId));
      }
      try {
        const result = await getUserFavoriteIdsAction();
        if (active && result.authenticated) {
          setIsFavorite(result.favoriteIds.includes(propertyId));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(result.favoriteIds));
          } catch {
            // Ignore storage errors
          }
        }
      } catch {
        // Fallback to localStorage state
      }
    };

    void syncState();
    return () => {
      active = false;
    };
  }, [propertyId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsBusy(true);

    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);

    try {
      const serverResult = await toggleFavoriteAction(propertyId);
      if (serverResult.success) {
        setIsFavorite(serverResult.isFavorite);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverResult.favoriteIds));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // Ignore storage errors
        }
        return;
      }

      // Visitor fallback: persist in localStorage
      const current = readLocalFavoriteIds();
      const updated = nextFavorite
        ? Array.from(new Set([...current, propertyId]))
        : current.filter((id) => id !== propertyId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // Ignore storage errors
      }
    } finally {
      setIsBusy(false);
      isTogglingRef.current = false;
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isBusy}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Remove ${propertyTitle} from favorites`
            : `Save ${propertyTitle} to favorites`
        }
        className={cn(
          'inline-flex items-center justify-center min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 rounded-full bg-white/95 backdrop-blur-xs shadow-sm transition-all hover:scale-105 cursor-pointer disabled:opacity-60',
          isFavorite ? 'text-rose-600' : 'text-neutral-500 hover:text-rose-500',
          className
        )}
      >
        <Heart className={cn('w-4 h-4', isFavorite && 'fill-rose-500 text-rose-500')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isBusy}
      aria-pressed={isFavorite}
      className={cn(
        'inline-flex items-center gap-1.5 min-h-10 sm:min-h-9 px-4 py-2 text-xs font-medium rounded-full border bg-white shadow-2xs transition-colors cursor-pointer disabled:opacity-60',
        isFavorite
          ? 'border-rose-300 text-rose-600 bg-rose-50/70'
          : 'border-[var(--color-border-light)] text-[var(--color-text-on-light)] hover:bg-[var(--color-bg-light-alt)]',
        className
      )}
    >
      <Heart
        className={cn(
          'w-3.5 h-3.5 transition-colors',
          isFavorite ? 'fill-rose-500 text-rose-500' : 'text-neutral-400'
        )}
      />
      <span>{isFavorite ? 'Saved to Favorites' : 'Save to Favorites'}</span>
    </button>
  );
};
