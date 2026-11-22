'use client';

import { useRef, useState } from 'react';
import { formatLastSaved } from '@/lib/format';
import { isSafeImagePath } from '@/lib/validations/media';
import { useUnsavedChanges } from '@/features/media/use-unsaved-changes';

export type ContentStatus = 'published' | 'draft';

// Fields shared by travel guides and blog posts that the editor shell reads or writes
export interface EditableContent {
  id?: number;
  title?: string;
  slug?: string;
  image?: string;
  excerpt?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: ContentStatus;
  publishDate?: string;
}

interface UseContentEditorOptions<T extends EditableContent> {
  serialize: (item: Partial<T> | null) => string;
  // Persists the payload and returns the saved id (if any)
  saveItem: (payload: Partial<T>) => Promise<number | undefined>;
  successMessage: (title: string, isNew: boolean, status: ContentStatus) => string;
  saveErrorFallback: string;
  onSaved: (message: string, isNew: boolean) => Promise<void>;
}

export interface ContentEditorController<T extends EditableContent> {
  isEditing: boolean;
  current: Partial<T> | null;
  persisted: T | null;
  isDirty: boolean;
  isSubmitting: boolean;
  formError: string | null;
  lastSavedLabel: string | null;
  // Read in event handlers only (backed by a ref)
  isBusy: () => boolean;
  confirmLeave: () => boolean;
  open: (draft: Partial<T>, persisted?: T) => void;
  close: () => void;
  update: <K extends keyof T>(key: K, value: T[K]) => void;
  save: (intentStatus?: ContentStatus) => Promise<void>;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function useContentEditor<T extends EditableContent>({
  serialize,
  saveItem,
  successMessage,
  saveErrorFallback,
  onSaved,
}: UseContentEditorOptions<T>): ContentEditorController<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<Partial<T> | null>(null);
  const [persisted, setPersisted] = useState<T | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState('');
  const [lastSavedById, setLastSavedById] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isBusyRef = useRef(false);

  const isDirty = isEditing && serialize(current) !== baselineSnapshot;
  const { confirmLeave } = useUnsavedChanges(isDirty);

  const reset = () => {
    setIsEditing(false);
    setCurrent(null);
    setPersisted(null);
    setBaselineSnapshot('');
    setFormError(null);
  };

  const open = (draft: Partial<T>, persistedItem?: T) => {
    // Edit a copy so seed content is preserved exactly until saved (AC-CMS-3)
    const editable = { ...draft };
    setCurrent(editable);
    setPersisted(persistedItem ?? null);
    setBaselineSnapshot(serialize(editable));
    setFormError(null);
    setIsEditing(true);
  };

  const close = () => {
    // Prevent abandoning the editor while a save request is still in flight
    if (isBusyRef.current) return;
    if (!confirmLeave()) return;
    reset();
  };

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    setCurrent((prev) => (prev ? ({ ...prev, [key]: value } as Partial<T>) : null));
  };

  const save = async (intentStatus?: ContentStatus) => {
    if (!current || isSubmitting || isBusyRef.current) return;

    const title = current.title?.trim() ?? '';
    if (!title) {
      setFormError('Please enter an article title.');
      return;
    }

    const trimmedImage = (current.image ?? '').trim();
    if (!trimmedImage || !isSafeImagePath(trimmedImage)) {
      setFormError('Cover image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    isBusyRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalStatus = intentStatus || current.status || 'published';
      const payload = {
        ...current,
        image: trimmedImage,
        status: finalStatus,
        seoTitle: current.seoTitle?.trim() || '',
        seoDescription: current.seoDescription?.trim() || '',
        slug: current.slug?.trim() || slugify(current.title ?? ''),
      } as Partial<T>;

      const isNew = !current.id;
      const savedId = await saveItem(payload);
      if (savedId) {
        const savedAt = new Date().toISOString();
        setLastSavedById((prev) => ({ ...prev, [savedId]: savedAt }));
      }
      const message = successMessage(payload.title ?? '', isNew, finalStatus);
      reset();
      await onSaved(message, isNew);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : saveErrorFallback);
    } finally {
      setIsSubmitting(false);
      isBusyRef.current = false;
    }
  };

  const sessionSavedAt = current?.id ? lastSavedById[current.id] : undefined;
  const lastSavedLabel = sessionSavedAt
    ? formatLastSaved(sessionSavedAt)
    : current?.id && current.publishDate
      ? current.publishDate
      : null;

  return {
    isEditing,
    current,
    persisted,
    isDirty,
    isSubmitting,
    formError,
    lastSavedLabel,
    isBusy: () => isBusyRef.current,
    confirmLeave,
    open,
    close,
    update,
    save,
  };
}
