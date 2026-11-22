'use client';

import React, { useRef } from 'react';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaUploadController } from './use-media-upload';
import { TEXT_INPUT_CLASS } from './styles';

interface UploadPanelProps {
  upload: MediaUploadController;
  multiple: boolean;
  altInputId: string;
  onViewLibrary: () => void;
}

export function UploadPanel({ upload, multiple, altInputId, onViewLibrary }: UploadPanelProps) {
  const { isDragging, setIsDragging, isUploading, uploadFiles } = upload;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={altInputId} className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5">
          Alt text (optional)
        </label>
        <input
          id={altInputId}
          type="text"
          value={upload.alt}
          maxLength={255}
          onChange={(e) => upload.setAlt(e.target.value)}
          placeholder="Describe the image for accessibility (e.g. Sunlit living room with desk)"
          className={TEXT_INPUT_CLASS}
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
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = Array.from(e.dataTransfer.files);
          if (dropped.length > 0) void uploadFiles(dropped);
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
            <p className="text-sm font-medium text-[var(--color-text-on-light)]">Uploading and optimizing image...</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)]">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-on-light)]">
              Drag and drop {multiple ? 'images' : 'an image'} here, or paste from clipboard
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-on-light-muted)]">
              JPEG, PNG, WebP, or static GIF up to 5 MB. Converted automatically to WebP.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple={multiple}
              data-testid="media-file-input"
              onChange={(e) => {
                const chosen = e.target.files ? Array.from(e.target.files) : [];
                // Clear so picking the same file again still fires onChange
                e.target.value = '';
                if (chosen.length > 0) void uploadFiles(chosen);
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

      {upload.error && (
        <div
          role="alert"
          data-testid="media-upload-error"
          className="flex items-start gap-2 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-xs text-[var(--color-error)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{upload.error}</span>
        </div>
      )}

      {multiple && upload.successCount > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3.5 py-2.5 text-xs text-[var(--color-success)]"
        >
          <span>
            {upload.successCount} {upload.successCount === 1 ? 'image' : 'images'} uploaded and added to your
            selection.
          </span>
          <button type="button" onClick={onViewLibrary} className="font-semibold underline cursor-pointer">
            View in Media Library
          </button>
        </div>
      )}
    </div>
  );
}
