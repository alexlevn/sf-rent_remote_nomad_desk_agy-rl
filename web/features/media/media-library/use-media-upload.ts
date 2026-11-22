'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from '@/lib/types/media';

const MAX_CLIENT_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface MediaUploadController {
  alt: string;
  setAlt: (value: string) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  isUploading: boolean;
  error: string | null;
  successCount: number;
  uploadFiles: (files: File[]) => Promise<void>;
}

interface UseMediaUploadOptions {
  multiple: boolean;
  // Paste-to-upload only listens while the Upload tab is visible
  isActive: boolean;
  isMountedRef: React.RefObject<boolean>;
  // Returns true when the parent consumed the upload and closed the dialog
  onUploaded: (items: MediaItem[], alt: string) => boolean;
}

async function uploadOne(file: File, alt: string): Promise<{ media?: MediaItem; error?: string }> {
  if (file.size === 0) return { error: 'Uploaded file is empty.' };
  if (file.size > MAX_CLIENT_UPLOAD_BYTES) return { error: 'File exceeds maximum allowed size of 5 MB.' };

  const formData = new FormData();
  formData.append('file', file);
  if (alt.length > 0) formData.append('alt', alt);

  let response: Response;
  try {
    response = await fetch('/api/uploads', { method: 'POST', body: formData });
  } catch {
    return { error: 'Network error while uploading image. Please try again.' };
  }

  const payload = (await response.json().catch(() => null)) as { media?: MediaItem; error?: string } | null;
  if (!response.ok || !payload?.media) {
    return { error: payload?.error || 'Failed to upload image. Please check the file and try again.' };
  }
  return { media: payload.media };
}

export function useMediaUpload({
  multiple,
  isActive,
  isMountedRef,
  onUploaded,
}: UseMediaUploadOptions): MediaUploadController {
  const [alt, setAlt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const isUploadingRef = useRef(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isUploadingRef.current) return;

      const queue = multiple ? files : [files[0]];
      const trimmedAlt = alt.trim();
      isUploadingRef.current = true;
      setIsUploading(true);
      setError(null);

      const uploadedItems: MediaItem[] = [];
      let firstError: string | null = null;

      try {
        for (const file of queue) {
          const result = await uploadOne(file, trimmedAlt);
          if (result.media) uploadedItems.push(result.media);
          else firstError ??= result.error ?? null;
        }

        // Ignore late completion if user closed the modal mid-upload
        if (!isMountedRef.current) return;

        if (firstError) setError(firstError);

        if (uploadedItems.length > 0) {
          const closed = onUploaded(uploadedItems, trimmedAlt);
          if (closed) return;
          setSuccessCount((prev) => prev + uploadedItems.length);
          setAlt('');
        }
      } finally {
        isUploadingRef.current = false;
        if (isMountedRef.current) setIsUploading(false);
      }
    },
    [alt, isMountedRef, multiple, onUploaded]
  );

  // Clipboard paste support while Upload tab is open
  useEffect(() => {
    if (!isActive) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        void uploadFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isActive, uploadFiles]);

  return { alt, setAlt, isDragging, setIsDragging, isUploading, error, successCount, uploadFiles };
}
