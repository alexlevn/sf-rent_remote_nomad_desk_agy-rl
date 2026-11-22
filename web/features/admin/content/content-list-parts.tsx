'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, ExternalLink, Plus, Search, Trash2, X } from 'lucide-react';

const TOAST_DURATION_MS = 3500;

export function useToastMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }, []);

  return { message, show };
}

export function SuccessToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm animate-in fade-in">
      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface ContentListHeaderProps {
  title: string;
  description: string;
  newLabel: string;
  newTestId: string;
  onNew: () => void;
}

export function ContentListHeader({ title, description, newLabel, newTestId, onNew }: ContentListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">{title}</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">{description}</p>
      </div>

      <button
        type="button"
        onClick={onNew}
        data-testid={newTestId}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>{newLabel}</span>
      </button>
    </div>
  );
}

export function DismissibleError({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{message}</span>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="p-1 rounded hover:bg-red-100 cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export const FILTER_SELECT_CLASS =
  'text-xs px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] cursor-pointer';

interface ContentFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  children: React.ReactNode;
}

export function ContentFilterBar({ search, onSearchChange, searchLabel, searchPlaceholder, children }: ContentFilterBarProps) {
  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label={searchLabel}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

interface StatusFilterSelectProps {
  value: 'all' | 'published' | 'draft';
  counts: { all: number; published: number; draft: number };
  onChange: (value: 'all' | 'published' | 'draft') => void;
}

export function StatusFilterSelect({ value, counts, onChange }: StatusFilterSelectProps) {
  return (
    <select
      aria-label="Filter by status"
      value={value}
      onChange={(e) => onChange(e.target.value as 'all' | 'published' | 'draft')}
      className={FILTER_SELECT_CLASS}
    >
      <option value="all">All Statuses ({counts.all})</option>
      <option value="published">Published ({counts.published})</option>
      <option value="draft">Draft ({counts.draft})</option>
    </select>
  );
}

export function ContentStatusPill({ status }: { status?: 'published' | 'draft' }) {
  return status === 'draft' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
      Draft
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
      Published
    </span>
  );
}

interface ContentRowActionsProps {
  title: string;
  liveHref: string | null;
  editTestId: string;
  deleteTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContentRowActions({ title, liveHref, editTestId, deleteTitle, onEdit, onDelete }: ContentRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {liveHref && (
        <Link
          href={liveHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${title} on live site`}
          className="p-1.5 rounded-lg border border-[var(--color-border-light)] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          title="View on Live Site"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      )}
      <button
        type="button"
        onClick={onEdit}
        data-testid={editTestId}
        className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        Edit (WYSIWYG)
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${title}`}
        className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        title={deleteTitle}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export const LIST_HEAD_ROW_CLASS =
  'border-b border-[var(--color-border-light)] bg-neutral-50/70 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]';
