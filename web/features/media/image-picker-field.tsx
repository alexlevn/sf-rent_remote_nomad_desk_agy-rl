'use client';

import React, { useId, useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeImagePath } from '@/lib/validations/media';
import { MediaLibraryModal } from '@/features/media/media-library-modal';

export interface ImagePickerFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string | null;
  allowClear?: boolean;
  testIdPrefix: string;
  disabled?: boolean;
  className?: string;
  previewAlt?: string;
  previewAspect?: 'landscape' | 'square';
  modalTitle?: string;
}

export function ImagePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = '/uploads/..., /seed/..., or https://...',
  helperText,
  error,
  allowClear = false,
  testIdPrefix,
  disabled = false,
  className,
  previewAlt,
  previewAspect = 'landscape',
  modalTitle = 'Choose or Upload Image',
}: ImagePickerFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);

  const trimmed = value.trim();
  const isPathValid = trimmed.length === 0 || isSafeImagePath(trimmed);
  const canRenderPreview =
    trimmed.length > 0 && isPathValid && failedPreviewUrl !== trimmed;
  const inlineError =
    error ||
    (!isPathValid
      ? 'Image path must be a valid /uploads/, /seed/, or https:// URL.'
      : null);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--color-text-on-light)]"
        >
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Thumbnail preview */}
        <div
          className={cn(
            'relative shrink-0 overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] flex items-center justify-center',
            previewAspect === 'square' ? 'h-20 w-20' : 'h-20 w-32',
          )}
        >
          {canRenderPreview ? (
            <Image
              src={trimmed}
              alt={previewAlt || label || 'Selected image preview'}
              fill
              unoptimized
              sizes={previewAspect === 'square' ? '80px' : '128px'}
              className="object-cover"
              onError={() => setFailedPreviewUrl(trimmed)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 px-2 text-center text-[var(--color-text-light-subtle)]">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px] leading-tight">
                {trimmed.length > 0 ? 'No preview' : 'No image'}
              </span>
            </div>
          )}
        </div>

        {/* Controls + URL input */}
        <div className="flex-1 min-w-0 w-full space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              data-testid={`${testIdPrefix}-open-btn`}
              onClick={() => setIsModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-alt)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5 text-[var(--color-brand)]" />
              <span>Choose / Upload Image</span>
            </button>

            {allowClear && trimmed.length > 0 && (
              <button
                type="button"
                disabled={disabled}
                data-testid={`${testIdPrefix}-clear-btn`}
                onClick={() => onChange('')}
                aria-label="Clear image"
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-3 py-2 text-xs font-medium text-[var(--color-text-on-light-muted)] hover:border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <input
            id={inputId}
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            data-testid={`${testIdPrefix}-input`}
            aria-invalid={inlineError ? true : undefined}
            className={cn(
              'w-full min-w-0 min-h-10 rounded-lg border bg-[var(--color-bg-light-surface)] px-3 py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]',
              inlineError
                ? 'border-[var(--color-error)]'
                : 'border-[var(--color-border-light)]',
              disabled && 'opacity-60 cursor-not-allowed bg-[var(--color-surface-muted)]',
            )}
          />

          {inlineError ? (
            <p className="text-xs text-[var(--color-error)]" role="alert">
              {inlineError}
            </p>
          ) : (
            helperText && (
              <p className="text-xs text-[var(--color-text-on-light-muted)]">
                {helperText}
              </p>
            )
          )}
        </div>
      </div>

      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(items) => {
          const first = items[0];
          if (first) {
            setFailedPreviewUrl(null);
            onChange(first.url);
          }
        }}
        multiple={false}
        allowUrlTab={true}
        initialTab="upload"
        title={modalTitle}
      />
    </div>
  );
}
