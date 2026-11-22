'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ExternalLink, MapPin, Send } from 'lucide-react';
import type { HostProfile, Location, Property, PropertyStatus } from '@/lib/types';
import type { AdminPropertySectionProps } from './form-values';
import { CardHeader, FieldError, RequiredMark, SubmitLabel, cardClass, inputClass, labelClass } from './form-ui';

interface PublishCardProps extends AdminPropertySectionProps {
  hosts: HostProfile[];
  initialData?: Property;
  isEditMode: boolean;
  isSubmitting: boolean;
  lastSavedLabel: string | null;
  canViewOnWeb: boolean;
}

export function PublishCard({
  values,
  errors,
  setField,
  hosts,
  initialData,
  isEditMode,
  isSubmitting,
  lastSavedLabel,
  canViewOnWeb,
}: PublishCardProps) {
  const selectedHost = hosts.find((h) => String(h.id) === values.hostId) ?? null;

  return (
    <section className={cardClass}>
      <CardHeader icon={Send}>Publish</CardHeader>

      <div className="space-y-4">
        <div>
          <label htmlFor="property-status" className={labelClass}>
            Publication Status
          </label>
          <select
            id="property-status"
            data-testid="property-status-select"
            value={values.status}
            onChange={(e) => setField('status', e.target.value as PropertyStatus)}
            className={inputClass}
          >
            <option value="published">Published (Visible publicly)</option>
            <option value="pending_review">Pending Review</option>
            <option value="hidden">Hidden (Removed from search)</option>
            <option value="draft">Draft</option>
            {initialData?.status === 'rejected' && <option value="rejected">Rejected</option>}
          </select>
        </div>

        <div>
          <label htmlFor="property-host" className={labelClass}>
            Owning Host <RequiredMark />
          </label>
          <select
            id="property-host"
            data-testid="property-host-select"
            value={values.hostId}
            onChange={(e) => setField('hostId', e.target.value)}
            aria-invalid={Boolean(errors.hostId) || undefined}
            className={inputClass}
            required
          >
            <option value="">Select a host...</option>
            {hosts.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.displayName} (Host #{h.id} · {h.status})
              </option>
            ))}
          </select>
          {selectedHost && selectedHost.status !== 'approved' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
              This host is currently <strong>{selectedHost.status}</strong>. Listings owned by non-approved hosts will
              not be publicly bookable until the host is approved.
            </p>
          )}
          <FieldError message={errors.hostId} />
        </div>

        {lastSavedLabel && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] pt-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Last saved: {lastSavedLabel}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--color-border-light)]">
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="property-submit-btn"
            className="w-full min-h-10 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold px-4 py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <SubmitLabel isSubmitting={isSubmitting} isEditMode={isEditMode} />
          </button>

          {canViewOnWeb && initialData && (
            <Link
              href={`/l/apartments/${initialData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="property-view-on-web-link"
              className="w-full min-h-10 rounded-xl border border-[var(--color-border-light)] bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold px-4 py-2 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View on Web</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

interface LocationCardProps extends AdminPropertySectionProps {
  locations: Location[];
  initialData?: Property;
  hasDefaultLocation: boolean;
}

export function LocationCard({
  values,
  errors,
  setField,
  locations,
  initialData,
  hasDefaultLocation,
}: LocationCardProps) {
  return (
    <section className={cardClass}>
      <CardHeader icon={MapPin}>Location</CardHeader>

      <div className="space-y-4">
        <div>
          <label htmlFor="property-city" className={labelClass}>
            Destination City <RequiredMark />
          </label>
          <select
            id="property-city"
            data-testid="property-city-select"
            value={values.selectedLocationId}
            onChange={(e) => setField('selectedLocationId', e.target.value)}
            className={inputClass}
            required
          >
            <option value="">
              {initialData?.city && !hasDefaultLocation
                ? `${initialData.city}${initialData.country ? `, ${initialData.country}` : ''} (Current)`
                : 'Select a city...'}
            </option>
            {locations.map((loc) => (
              <option key={loc.id} value={String(loc.id)}>
                {loc.city}, {loc.country}
                {!loc.isActive ? ' (Inactive)' : ''}
              </option>
            ))}
          </select>
          <FieldError message={errors.city} />
        </div>

        <div>
          <label htmlFor="property-neighborhood" className={labelClass}>
            Neighborhood
          </label>
          <input
            id="property-neighborhood"
            data-testid="property-neighborhood-input"
            type="text"
            value={values.neighborhood}
            onChange={(e) => setField('neighborhood', e.target.value)}
            placeholder="e.g. Salamanca, Eixample, Palermo"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="property-address" className={labelClass}>
            Street Address
          </label>
          <input
            id="property-address"
            data-testid="property-address-input"
            type="text"
            value={values.address}
            onChange={(e) => setField('address', e.target.value)}
            placeholder="e.g. Calle de Serrano 42"
            className={inputClass}
          />
        </div>
      </div>
    </section>
  );
}
