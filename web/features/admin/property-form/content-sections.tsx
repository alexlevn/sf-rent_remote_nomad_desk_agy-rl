'use client';

import React from 'react';
import { Building2, FileText } from 'lucide-react';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import type { AdminPropertySectionProps } from './form-values';
import { CardHeader, CardTitle, FieldError, RequiredMark, cardClass, inputClass, labelClass } from './form-ui';

export function BasicsSection({ values, errors, setField }: AdminPropertySectionProps) {
  return (
    <section className={cardClass}>
      <CardHeader icon={Building2}>Basics</CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="property-title" className={labelClass}>
            Property Title <RequiredMark />
          </label>
          <input
            id="property-title"
            data-testid="property-title-input"
            type="text"
            value={values.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="e.g. Sunlit 2BR Penthouse with Dual-Monitor Desk"
            aria-invalid={Boolean(errors.title) || undefined}
            className={inputClass}
            required
          />
          <FieldError message={errors.title} />
        </div>

        <div>
          <label htmlFor="property-slug" className={labelClass}>
            URL Slug{' '}
            <span className="font-normal text-[var(--color-text-on-light-muted)]">(auto-generated if blank)</span>
          </label>
          <input
            id="property-slug"
            data-testid="property-slug-input"
            type="text"
            value={values.slug}
            onChange={(e) => setField('slug', e.target.value)}
            placeholder="e.g. sunlit-2br-penthouse-madrid"
            className={inputClass}
          />
          <FieldError message={errors.slug} />
        </div>
      </div>
    </section>
  );
}

export function RichContentSection({ values, setField }: Omit<AdminPropertySectionProps, 'errors'>) {
  return (
    <section className={cardClass}>
      <div className="pb-3 border-b border-[var(--color-border-light)]">
        <CardTitle icon={FileText}>Description & House Rules</CardTitle>
        <p className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
          Supports rich formatting, lists, tables, links, embedded images via Media Library, and sanitized HTML.
        </p>
      </div>

      <div className="space-y-2">
        <span className={labelClass}>Property Description</span>
        <TiptapEditor
          value={values.description}
          onChange={(html) => setField('description', html)}
          label="Property Description"
          placeholder="Describe the apartment layout, natural light, neighborhood highlights, and workspace..."
          minHeight="220px"
          testIdPrefix="property-description-editor"
        />
      </div>

      <div className="space-y-2">
        <span className={labelClass}>House Rules</span>
        <TiptapEditor
          value={values.houseRules}
          onChange={(html) => setField('houseRules', html)}
          label="House Rules & Check-in Notes"
          placeholder="Specify smoking rules, quiet hours, pet policy, and key handover notes..."
          minHeight="160px"
          testIdPrefix="property-rules-editor"
        />
      </div>
    </section>
  );
}
