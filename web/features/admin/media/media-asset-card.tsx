'use client';

import React from 'react';
import Image from 'next/image';
import { Check, Copy, Loader2, Trash2 } from 'lucide-react';
import type { MediaItem } from '@/lib/types/media';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';

function formatUploadedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

interface MediaAssetCardProps {
  item: MediaItem;
  isDeleting: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onDelete: () => void;
}

export function MediaAssetCard({ item, isDeleting, isCopied, onCopy, onDelete }: MediaAssetCardProps) {
  const uploadedLabel = formatUploadedDate(item.createdAt);

  return (
    <article
            data-testid={`media-item-${item.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] shadow-2xs"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[var(--color-surface-muted)]">
        <Image
          src={item.url}
          alt={item.alt || item.storageKey}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />
        <span
          title={
            item.isInUse
              ? `Referenced in ${item.usageCount} ${item.usageCount === 1 ? 'record' : 'records'}`
              : 'Not referenced by any record'
          }
          className={cn(
            'absolute left-2.5 top-2.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-2xs',
            item.isInUse
              ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info)]'
              : 'border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)]/95 text-[var(--color-text-on-light-muted)]',
          )}
        >
          {item.isInUse ? `In use (${item.usageCount})` : 'Unused'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 min-w-0">
        <div className="min-w-0">
          <p
            className="truncate text-xs font-semibold text-[var(--color-text-on-light)]"
            title={item.alt || item.storageKey}
          >
            {item.alt || item.storageKey}
          </p>
          <p className="text-[11px] text-[var(--color-text-on-light-muted)] mt-0.5">
            {item.width}×{item.height} · {formatFileSize(item.sizeBytes)}
            {uploadedLabel ? ` · ${uploadedLabel}` : ''}
          </p>
          <p
            className="mt-1 truncate font-mono text-[11px] text-[var(--color-text-light-subtle)]"
            title={item.url}
          >
            {item.url}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-[var(--color-border-light)]">
          <button
            type="button"
            data-testid={`media-copy-${item.id}`}
            onClick={onCopy}
            className="flex-1 inline-flex min-h-10 sm:min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>

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
            onClick={onDelete}
            className={cn(
              'inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
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
    </article>
  );
}
