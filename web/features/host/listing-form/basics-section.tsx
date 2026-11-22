'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import type { Location, Property } from '@/lib/types';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import type { HostListingSectionProps } from './form-values';
import {
  FieldError,
  RequiredMark,
  SectionHeader,
  labelClass,
  plainInputClass,
  selectClass,
  validatedInputClass,
} from './form-ui';

const FALLBACK_CITIES = [
  ['Madrid', 'Madrid, Spain'],
  ['Barcelona', 'Barcelona, Spain'],
  ['Buenos Aires', 'Buenos Aires, Argentina'],
  ['Lima', 'Lima, Peru'],
] as const;

interface BasicsSectionProps extends HostListingSectionProps {
  locations: Location[];
  initialData?: Property;
}

export function ListingBasicsSection({ values, errors, setField, locations, initialData }: BasicsSectionProps) {
  const hasCurrentCityInLocations = locations.some((l) => l.city.toLowerCase() === values.city.toLowerCase());

  return (
    <section aria-labelledby="section-basics">
      <SectionHeader id="section-basics" icon={Building2}>
        1. Basic Overview
      </SectionHeader>

      <div className="space-y-4">
        <div>
          <label htmlFor="listing-title" className={labelClass}>
            Listing Title <RequiredMark />
          </label>
          <input
            id="listing-title"
            type="text"
            value={values.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="e.g. Work Remotely Above Madrid: Curated 3-br Sky Home, Jerónimos"
            className={validatedInputClass(Boolean(errors.title))}
            aria-invalid={Boolean(errors.title)}
          />
          <FieldError message={errors.title} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="listing-city" className={labelClass}>
              City <RequiredMark />
            </label>
            <select
              id="listing-city"
              value={values.city}
              onChange={(e) => setField('city', e.target.value)}
              className={selectClass}
            >
              {!hasCurrentCityInLocations && values.city && (
                <option value={values.city}>
                  {values.city}
                  {initialData?.country ? `, ${initialData.country}` : ''} (Archived)
                </option>
              )}
              {locations.map((loc) => (
                <option key={loc.id} value={loc.city}>
                  {loc.city}, {loc.country}
                </option>
              ))}
              {locations.length === 0 &&
                FALLBACK_CITIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
            <FieldError message={errors.city} />
          </div>

          <div>
            <label htmlFor="listing-neighborhood" className={labelClass}>
              Neighborhood
            </label>
            <input
              id="listing-neighborhood"
              type="text"
              value={values.neighborhood}
              onChange={(e) => setField('neighborhood', e.target.value)}
              placeholder="e.g. Jerónimos, Retiro, Salamanca"
              className={plainInputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="listing-address" className={labelClass}>
            Street Address (Visible after confirmation)
          </label>
          <input
            id="listing-address"
            type="text"
            value={values.address}
            onChange={(e) => setField('address', e.target.value)}
            placeholder="e.g. Calle de Alfonso XII, 28014 Madrid"
            className={plainInputClass}
          />
        </div>

        <div>
          <span className={labelClass}>Description (WYSIWYG Editorial)</span>
          <TiptapEditor
            value={values.description}
            onChange={(html) => setField('description', html)}
            label="Listing Description"
            placeholder="Describe the interior, neighborhood vibe, workstation ergonomics, natural lighting, and proximity to cafes..."
            minHeight="220px"
            editorId="listing-description"
            testIdPrefix="host-description-editor"
          />
          <FieldError message={errors.description} asAlert />
        </div>
      </div>
    </section>
  );
}
