'use client';

import { useState } from 'react';
import { isSafeImagePath } from '@/lib/validations/media';
import type { SelectedMediaItem } from '@/features/media/media-library-modal';

export const MAX_PROPERTY_IMAGES = 50;

const LIMIT_MESSAGE = `Maximum ${MAX_PROPERTY_IMAGES} images allowed per property.`;
const INVALID_URL_MESSAGE = 'Enter a valid image path (/uploads/..., /seed/...) or https:// URL.';

export interface PropertyImagesController {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  imageError: string | null;
  clearImageError: () => void;
  urlDraft: string;
  setUrlDraft: (value: string) => void;
  addUrlDraft: () => void;
  addFromMediaLibrary: (selected: SelectedMediaItem[]) => void;
  toggleImage: (url: string) => void;
  moveImage: (index: number, direction: 'up' | 'down') => void;
  setCover: (index: number) => void;
  removeImage: (index: number) => void;
  isMediaModalOpen: boolean;
  setMediaModalOpen: (open: boolean) => void;
  isSeedPickerOpen: boolean;
  toggleSeedPicker: () => void;
}

// Shared photo-gallery state for the admin and host property forms.
// onImagesAdded lets the form clear its own "images" field error once a photo is added.
export function usePropertyImages(initialImages: string[], onImagesAdded: () => void): PropertyImagesController {
  const [images, setImages] = useState<string[]>(initialImages);
  const [imageError, setImageError] = useState<string | null>(null);
  const [urlDraft, setUrlDraftState] = useState('');
  const [isMediaModalOpen, setMediaModalOpen] = useState(false);
  const [isSeedPickerOpen, setSeedPickerOpen] = useState(false);

  const setUrlDraft = (value: string) => {
    setUrlDraftState(value);
    if (imageError) setImageError(null);
  };

  const addUrlDraft = () => {
    const trimmed = urlDraft.trim();
    if (!isSafeImagePath(trimmed)) {
      setImageError(INVALID_URL_MESSAGE);
      return;
    }
    if (images.includes(trimmed)) {
      setImageError('This image is already in the gallery.');
      return;
    }
    if (images.length >= MAX_PROPERTY_IMAGES) {
      setImageError(LIMIT_MESSAGE);
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setUrlDraftState('');
    setImageError(null);
    onImagesAdded();
  };

  const addFromMediaLibrary = (selected: SelectedMediaItem[]) => {
    if (selected.length === 0) return;

    const next = [...images];
    let hitLimit = false;
    let addedCount = 0;

    for (const item of selected) {
      const trimmed = item.url.trim();
      if (!isSafeImagePath(trimmed) || next.includes(trimmed)) continue;
      if (next.length >= MAX_PROPERTY_IMAGES) {
        hitLimit = true;
        break;
      }
      next.push(trimmed);
      addedCount += 1;
    }

    if (addedCount > 0) {
      setImages(next);
      onImagesAdded();
    }
    setImageError(hitLimit ? LIMIT_MESSAGE : null);
  };

  const toggleImage = (url: string) => {
    setImageError(null);
    if (images.includes(url)) {
      setImages((prev) => prev.filter((item) => item !== url));
      return;
    }
    if (images.length >= MAX_PROPERTY_IMAGES) {
      setImageError(LIMIT_MESSAGE);
      return;
    }
    setImages((prev) => [...prev, url]);
    onImagesAdded();
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const setCover = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    setImages((prev) => [prev[index], ...prev.filter((_, idx) => idx !== index)]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  return {
    images,
    setImages,
    imageError,
    clearImageError: () => setImageError(null),
    urlDraft,
    setUrlDraft,
    addUrlDraft,
    addFromMediaLibrary,
    toggleImage,
    moveImage,
    setCover,
    removeImage,
    isMediaModalOpen,
    setMediaModalOpen,
    isSeedPickerOpen,
    toggleSeedPicker: () => setSeedPickerOpen((prev) => !prev),
  };
}
