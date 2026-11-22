'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeImagePath } from '@/lib/validations/media';
import { ERROR_BOX_CLASS, TEXT_INPUT_CLASS } from './styles';

export interface UrlDraft {
  url: string;
  alt: string;
}

interface UrlPanelProps {
  draft: UrlDraft;
  onDraftChange: (draft: UrlDraft) => void;
  error: string | null;
  urlInputId: string;
  altInputId: string;
  onInsert: () => void;
  onCancel: () => void;
}

// Plain div instead of <form>: the modal can mount inside a parent form
export function UrlPanel({ draft, onDraftChange, error, urlInputId, altInputId, onInsert, onCancel }: UrlPanelProps) {
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const trimmedUrl = draft.url.trim();
  const canPreview = isSafeImagePath(trimmedUrl) && failedPreview !== trimmedUrl;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onInsert();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={urlInputId} className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
          Image URL / Path
        </label>
        <input
          id={urlInputId}
          type="text"
          value={draft.url}
          onChange={(e) => onDraftChange({ ...draft, url: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="/seed/guide/placeholder.webp, /uploads/..., or https://..."
          className={TEXT_INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-[var(--color-text-on-light-muted)]">
          Accepts local <code className="font-mono">/uploads/...</code>, <code className="font-mono">/seed/...</code>,
          or <code className="font-mono">https://</code> URLs.
        </p>
      </div>

      <div>
        <label htmlFor={altInputId} className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
          Alt text (optional)
        </label>
        <input
          id={altInputId}
          type="text"
          value={draft.alt}
          maxLength={255}
          onChange={(e) => onDraftChange({ ...draft, alt: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="Describe the image for accessibility"
          className={TEXT_INPUT_CLASS}
        />
      </div>

      {canPreview && (
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-[var(--color-text-on-light-muted)]">Preview</span>
          <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]">
            <Image
              src={trimmedUrl}
              alt={draft.alt.trim() || 'URL image preview'}
              fill
              unoptimized
              sizes="320px"
              className="object-cover"
              onError={() => setFailedPreview(trimmedUrl)}
            />
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className={cn('flex items-start gap-2', ERROR_BOX_CLASS)}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="media-url-insert-btn"
          onClick={onInsert}
          className="min-h-10 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
        >
          Insert Image
        </button>
      </div>
    </div>
  );
}
