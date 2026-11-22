'use client';

import React, { useRef } from 'react';
import { AlertCircle, Check, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploadCardProps {
  altInputId: string;
  alt: string;
  onAltChange: (value: string) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  isUploading: boolean;
  error: string | null;
  successMessage: string | null;
  onFiles: (files: File[]) => Promise<void>;
}

export function MediaUploadCard({
  altInputId,
  alt,
  onAltChange,
  isDragging,
  setIsDragging,
  isUploading,
  error,
  successMessage,
  onFiles,
}: MediaUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border-light)]">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-[var(--color-brand)]" />
          <h2 className="text-base font-bold text-[var(--color-text-on-light)]">
            Upload New Images
          </h2>
        </div>
        <span className="text-xs text-[var(--color-text-on-light-muted)]">
          JPEG, PNG, WebP, or static GIF · Max 5 MB · Auto WebP (≤ 1600 px)
        </span>
      </div>

      <div>
        <label
          htmlFor={altInputId}
          className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
        >
          Alt text (optional)
        </label>
        <input
          id={altInputId}
          type="text"
          value={alt}
          maxLength={255}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Describe the uploaded image for accessibility (e.g. Modern loft desk setup)"
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
            void onFiles(dropped);
          }
        }}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
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
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)]">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-on-light)]">
              Drag and drop images here, or paste from clipboard
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-on-light-muted)]">
              Uploaded assets are stored persistently and can be reused across
              properties, guides, and blog posts.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              data-testid="media-file-input"
              onChange={(e) => {
                const chosen = e.target.files
                  ? Array.from(e.target.files)
                  : [];
                // Clear so picking the same file again still fires onChange
                e.target.value = '';
                if (chosen.length > 0) {
                  void onFiles(chosen);
                }
              }}
              className="sr-only"
              aria-label="Choose image files to upload"
            />

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>Select Files</span>
            </button>
          </>
        )}
      </div>

      {error && (
        <div
          role="alert"
          data-testid="media-upload-error"
          className="flex items-start gap-2 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          data-testid="media-upload-success"
          className="flex items-center gap-2 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-success)]"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </section>
  );
}
