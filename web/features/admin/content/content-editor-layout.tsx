'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Clock, ExternalLink, Loader2, Save } from 'lucide-react';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { cn } from '@/lib/utils';
import type { ContentEditorController, ContentStatus, EditableContent } from './use-content-editor';

export const CARD_CLASS = 'bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-2xs space-y-4 text-xs';
export const FIELD_CLASS =
  'w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]';
export const SELECT_CLASS = cn(FIELD_CLASS, 'bg-white');
export const FIELD_LABEL_CLASS = 'block font-semibold text-neutral-700 mb-1';

const OUTLINE_BTN =
  'min-h-10 px-4 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer';

export function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-sm text-[var(--color-text-on-light)] pb-2 border-b border-[var(--color-border-light)]">
      {children}
    </h3>
  );
}

export interface ContentEditorCopy {
  // data-testid prefix: "guide" or "post"
  testIdPrefix: string;
  backLabel: string;
  editingLabel: (id: number) => string;
  draftingLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  publishLabel: string;
  seoTitlePlaceholder: string;
}

interface ContentEditorLayoutProps<T extends EditableContent> {
  editor: ContentEditorController<T>;
  copy: ContentEditorCopy;
  viewOnWebHref: string | null;
  // Type-specific taxonomy card (city/category/author/cover image/slug)
  taxonomy: React.ReactNode;
}

export function ContentEditorLayout<T extends EditableContent>({
  editor,
  copy,
  viewOnWebHref,
  taxonomy,
}: ContentEditorLayoutProps<T>) {
  const { current, isSubmitting, formError, isDirty, lastSavedLabel } = editor;
  const p = copy.testIdPrefix;
  const primaryLabel = current?.status === 'draft' ? 'Save as Draft' : copy.publishLabel;
  // Shell only edits the shared fields, so a narrowed setter keeps call sites simple
  const setField = editor.update as <K extends keyof EditableContent>(key: K, value: EditableContent[K]) => void;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={editor.close}
          data-testid={`${p}-back-btn`}
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--color-brand)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{copy.backLabel}</span>
        </button>
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span>{current?.id ? copy.editingLabel(current.id) : copy.draftingLabel}</span>
          {viewOnWebHref && (
            <Link
              href={viewOnWebHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${p}-view-on-web-link`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border-light)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span>View on Web</span>
            </Link>
          )}
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                {copy.titleLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={current?.title || ''}
                onChange={(e) => setField('title', e.target.value)}
                placeholder={copy.titlePlaceholder}
                data-testid={`${p}-title-input`}
                className="w-full text-base font-bold p-3 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Excerpt / Lead Summary</label>
              <textarea
                rows={2}
                value={current?.excerpt || ''}
                onChange={(e) => setField('excerpt', e.target.value)}
                placeholder="Short summary displayed on cards and search results..."
                className="w-full text-xs p-3 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Article Body (Rich WYSIWYG Editor)
              </label>
              <TiptapEditor
                value={current?.content || ''}
                onChange={(val) => setField('content', val)}
                placeholder="Start typing your article, H2 headings, bullet lists, links, tables, or embed media..."
                minHeight="360px"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-5 shadow-2xs space-y-4">
            <CardHeading>Publishing</CardHeading>

            <div className="space-y-3 text-xs">
              <div>
                <label className={FIELD_LABEL_CLASS}>Status</label>
                <select
                  value={current?.status || 'published'}
                  onChange={(e) => setField('status', e.target.value as ContentStatus)}
                  data-testid={`${p}-status-select`}
                  className={SELECT_CLASS}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>Publish Date</label>
                <input
                  type="text"
                  value={current?.publishDate || ''}
                  onChange={(e) => setField('publishDate', e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div
                data-testid={`${p}-last-saved`}
                className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] pt-1"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{lastSavedLabel ? `Last saved: ${lastSavedLabel}` : 'Not saved yet'}</span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => editor.save()}
                  data-testid={`publish-${p}-btn`}
                  className="w-full min-h-10 py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white font-semibold text-xs hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : primaryLabel}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => editor.save('draft')}
                  data-testid={`save-draft-${p}-btn`}
                  className="w-full min-h-10 py-2.5 px-4 rounded-xl border border-[var(--color-border-light)] bg-white text-neutral-700 font-semibold text-xs hover:bg-neutral-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </div>
          </div>

          {taxonomy}

          <div className={CARD_CLASS}>
            <CardHeading>SEO Metadata</CardHeading>

            <div>
              <label className={FIELD_LABEL_CLASS}>SEO Title</label>
              <input
                type="text"
                maxLength={160}
                value={current?.seoTitle || ''}
                onChange={(e) => setField('seoTitle', e.target.value)}
                placeholder={copy.seoTitlePlaceholder}
                data-testid={`${p}-seo-title-input`}
                className={FIELD_CLASS}
              />
              <span className="text-[10px] text-neutral-400 block mt-1">{(current?.seoTitle || '').length} / 160 chars</span>
            </div>

            <div>
              <label className={FIELD_LABEL_CLASS}>SEO Meta Description</label>
              <textarea
                rows={3}
                maxLength={320}
                value={current?.seoDescription || ''}
                onChange={(e) => setField('seoDescription', e.target.value)}
                placeholder="Defaults to excerpt if left blank (150–160 chars recommended)"
                data-testid={`${p}-seo-description-input`}
                className={cn(FIELD_CLASS, 'resize-none')}
              />
              <span className="text-[10px] text-neutral-400 block mt-1">
                {(current?.seoDescription || '').length} / 320 chars
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        data-testid={`${p}-sticky-save-bar`}
        className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-light)] bg-white/95 backdrop-blur-xs px-4 py-3 shadow-lg"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', isDirty ? 'bg-amber-500' : 'bg-emerald-500')} />
          <span
            data-testid={`${p}-dirty-status`}
            className={isDirty ? 'text-amber-700 font-semibold' : 'text-[var(--color-text-on-light-muted)]'}
          >
            {isDirty ? 'Unsaved changes' : 'Ready to save'}
          </span>
          {lastSavedLabel && (
            <span className="text-[var(--color-text-on-light-muted)]">· Last saved: {lastSavedLabel}</span>
          )}
          {formError && (
            <span role="alert" className="text-red-600 font-semibold">
              · {formError}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={editor.close}
            data-testid={`${p}-cancel-btn`}
            className={cn(OUTLINE_BTN, 'disabled:cursor-not-allowed')}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => editor.save('draft')}
            data-testid={`${p}-sticky-draft-btn`}
            className={OUTLINE_BTN}
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => editor.save()}
            data-testid={`${p}-sticky-publish-btn`}
            className="min-h-10 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{primaryLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
