'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin, Trash2, X } from 'lucide-react';
import type { Location } from '@/lib/types';
import { saveLocationAction } from '@/app/admin/cms-actions';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { isSafeImagePath } from '@/lib/validations/media';
import { cn } from '@/lib/utils';

const FIELD_CLASS =
  'w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]';
const LABEL_CLASS = 'block font-semibold text-neutral-700 mb-1';
const CONTINENT_OPTIONS = ['Europe', 'North America', 'South America', 'Central America', 'Asia', 'Africa'];
const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038];

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseCoordinates(latDraft: string, lngDraft: string): [number, number] | null {
  const lat = Number(latDraft.trim());
  const lng = Number(lngDraft.trim());
  if (latDraft.trim() === '' || lngDraft.trim() === '') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

export function buildNewLocationDraft(): Partial<Location> {
  return {
    name: '',
    city: '',
    slug: '',
    country: '',
    countryCode: '',
    continent: 'Europe',
    propertiesCount: 0,
    description: '',
    image: '/seed/location/2241.jpg',
    center: DEFAULT_CENTER,
    isActive: true,
    position: undefined,
  };
}

interface LocationEditModalProps {
  initial: Partial<Location>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  // Deletes and refreshes the list; throws when the server refuses
  onDelete: (id: number) => Promise<void>;
}

export function LocationEditModal({ initial, onClose, onSaved, onDelete }: LocationEditModalProps) {
  const [draft, setDraft] = useState<Partial<Location>>(() => ({ ...initial }));
  const [latDraft, setLatDraft] = useState(() => String(initial.center?.[0] ?? DEFAULT_CENTER[0]));
  const [lngDraft, setLngDraft] = useState(() => String(initial.center?.[1] ?? DEFAULT_CENTER[1]));
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isBusyRef = useRef(false);

  const update = (patch: Partial<Location>) => setDraft((prev) => ({ ...prev, ...patch }));

  // Close on Escape (skip if media picker is open or save is in flight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !isMediaPickerOpen && !isBusyRef.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMediaPickerOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isBusyRef.current) return;

    const name = draft.name?.trim() ?? '';
    const country = draft.country?.trim() ?? '';
    if (!name || !country) {
      setFormError('Please enter city name and country.');
      return;
    }

    const countryCode = (draft.countryCode || '').trim().toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(countryCode)) {
      setFormError('Please enter a valid 2–3 letter country code (e.g. ES, PT, US).');
      return;
    }

    const center = parseCoordinates(latDraft, lngDraft);
    if (!center) {
      setFormError('Please enter valid map coordinates (lat -90..90, lng -180..180).');
      return;
    }

    const image = (draft.image || '').trim();
    if (!image || !isSafeImagePath(image)) {
      setFormError('Cover image must be a valid /uploads/, /seed/, or https:// URL.');
      return;
    }

    isBusyRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: Partial<Location> = {
        ...draft,
        name,
        country,
        countryCode,
        image,
        center,
        city: draft.city?.trim() || name,
        slug: draft.slug?.trim() || slugify(name),
      };
      await saveLocationAction(payload);
      await onSaved(
        draft.id ? `Destination ${name} updated successfully!` : `Destination ${name} created and live everywhere!`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save location.');
    } finally {
      setIsSubmitting(false);
      isBusyRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    if (!confirm('Are you sure you want to delete this destination?')) return;
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setFormError(null);
    try {
      await onDelete(draft.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Cannot delete destination.');
    } finally {
      isBusyRef.current = false;
    }
  };

  const hasProperties = (draft.propertiesCount || 0) > 0;
  const title = draft.id ? 'Edit Destination' : 'Add New Destination';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in',
        // Hide (not unmount) while the nested media picker is open so form state survives
        isMediaPickerOpen ? 'hidden' : '',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border-light)] shadow-2xl p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] mb-4">
          <h2 className="text-lg font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--color-brand)]" />
            <span>{title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>
                City Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={draft.name || ''}
                onChange={(e) => update({ name: e.target.value, city: e.target.value })}
                placeholder="e.g. Lisbon"
                data-testid="location-name-input"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Slug</label>
              <input
                type="text"
                value={draft.slug || ''}
                onChange={(e) => update({ slug: e.target.value })}
                placeholder="e.g. lisbon"
                data-testid="location-slug-input"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={LABEL_CLASS}>
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={draft.country || ''}
                onChange={(e) => update({ country: e.target.value })}
                placeholder="e.g. Portugal"
                data-testid="location-country-input"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Country Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={draft.countryCode || ''}
                onChange={(e) => update({ countryCode: e.target.value.toUpperCase() })}
                placeholder="e.g. PT"
                maxLength={3}
                className={cn(FIELD_CLASS, 'uppercase')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Continent</label>
              <select
                value={draft.continent || 'Europe'}
                onChange={(e) => update({ continent: e.target.value })}
                className={FIELD_CLASS}
              >
                {CONTINENT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Initial Properties Count</label>
              <input
                type="number"
                min={0}
                value={draft.propertiesCount ?? 0}
                onChange={(e) => update({ propertiesCount: Number(e.target.value) })}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Description</label>
            <TiptapEditor
              value={draft.description || ''}
              onChange={(val) => update({ description: val })}
              label="Destination Description"
              placeholder="Write a city overview for the destination page and SEO meta..."
              minHeight="160px"
              testIdPrefix="location-description-editor"
            />
          </div>

          <ImagePickerField
            id="location-cover-image"
            label="Cover Image"
            value={draft.image || ''}
            onChange={(url) => update({ image: url })}
            onModalOpenChange={setIsMediaPickerOpen}
            placeholder="/seed/location/2077.jpg"
            helperText="Choose from the Media Library, upload a new photo, or enter a /uploads/, /seed/, or https:// path."
            testIdPrefix="location-cover-image"
            previewAlt={draft.name || 'Destination cover'}
            modalTitle="Choose Destination Cover Image"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="location-map-lat" className={LABEL_CLASS}>
                Map Lat
              </label>
              <input
                id="location-map-lat"
                type="text"
                inputMode="decimal"
                value={latDraft}
                onChange={(e) => setLatDraft(e.target.value)}
                placeholder="e.g. 38.7223"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="location-map-lng" className={LABEL_CLASS}>
                Map Lng
              </label>
              <input
                id="location-map-lng"
                type="text"
                inputMode="decimal"
                value={lngDraft}
                onChange={(e) => setLngDraft(e.target.value)}
                placeholder="e.g. -9.1393"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isActive !== false}
                onChange={(e) => update({ isActive: e.target.checked })}
                data-testid="location-active-checkbox"
                className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
              />
              <span className="font-semibold text-neutral-800">Visible on Platform</span>
            </label>

            <div>
              <label className={LABEL_CLASS}>Top Cities Order (1 to 8, or leave blank to unfeature)</label>
              <input
                type="number"
                min={1}
                max={8}
                value={draft.position && draft.position <= 8 ? draft.position : ''}
                onChange={(e) => {
                  // Existing cities use 99 to mean "not featured"; new ones simply omit it
                  const val = e.target.value ? Number(e.target.value) : draft.id ? 99 : undefined;
                  update({ position: val });
                }}
                placeholder="e.g. 8 for #8 in Top Cities"
                data-testid="location-top-order-input"
                className="w-full p-2 rounded-lg border border-neutral-300 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-light)]">
            {draft.id ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={hasProperties}
                className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                title={hasProperties ? 'Cannot delete when properties exist' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--color-border-light)] text-neutral-700 text-xs font-medium hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="save-location-btn"
                className="px-5 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Destination'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
