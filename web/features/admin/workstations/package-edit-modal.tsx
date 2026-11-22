'use client';

import React, { useRef, useState } from 'react';
import { Package, Plus, X } from 'lucide-react';
import type { WorkstationPackage } from '@/lib/types';
import { saveWorkstationPackageAction } from '@/app/admin/cms-actions';
import { CurrencyInput } from '@/features/media/currency-input';
import {
  MAX_EUR_PRICE,
  MAX_FEATURE_LENGTH,
  MAX_FEATURES_COUNT,
  isValidEurPrice,
} from './constants';
import {
  VisibilityCheckbox,
  WorkstationModalFooter,
  WorkstationModalFrame,
} from './workstation-modal-frame';

interface PackageEditModalProps {
  pkg: WorkstationPackage;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}

export function PackageEditModal({ pkg, onClose, onSaved }: PackageEditModalProps) {
  const [draft, setDraft] = useState<WorkstationPackage>(() => ({
    ...pkg,
    features: [...(pkg.features ?? [])],
  }));
  const [priceEUR, setPriceEUR] = useState<number | ''>(() => Math.round(pkg.pricePerMonth / 100));
  const [featureDraft, setFeatureDraft] = useState('');
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSavingRef = useRef(false);

  const features = draft.features ?? [];

  const handleAddFeature = () => {
    const trimmed = featureDraft.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_FEATURE_LENGTH) {
      setFeatureError(`Each feature must be ${MAX_FEATURE_LENGTH} characters or fewer.`);
      return;
    }
    if (features.length >= MAX_FEATURES_COUNT) {
      setFeatureError(`You can add up to ${MAX_FEATURES_COUNT} features per package.`);
      return;
    }
    if (features.some((item) => item.trim().toLowerCase() === trimmed.toLowerCase())) {
      setFeatureError('This feature is already listed.');
      return;
    }

    setDraft((prev) => ({ ...prev, features: [...(prev.features ?? []), trimmed] }));
    setFeatureDraft('');
    setFeatureError(null);
  };

  const handleRemoveFeature = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      features: (prev.features ?? []).filter((_, idx) => idx !== index),
    }));
    setFeatureError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;

    if (!isValidEurPrice(priceEUR)) {
      setFormError('Please enter a valid monthly price in EUR.');
      return;
    }

    isSavingRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveWorkstationPackageAction({
        id: draft.id,
        name: draft.name,
        pricePerMonth: Math.round(priceEUR * 100),
        description: draft.description,
        features,
        isActive: draft.isActive !== false,
      });
      await onSaved(`Workstation package "${draft.name}" updated to €${priceEUR}/mo!`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update package');
    } finally {
      setIsSubmitting(false);
      isSavingRef.current = false;
    }
  };

  return (
    <WorkstationModalFrame
      ariaLabel={`Edit Package: ${draft.name}`}
      title={
        <>
          <Package className="w-5 h-5 text-[var(--color-brand)]" />
          <span>Edit Package: {draft.name}</span>
        </>
      }
      isBusy={isSubmitting}
      error={formError}
      onClose={onClose}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Package Name</label>
          <input
            type="text"
            required
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="pkg-price-input" className="block font-semibold text-neutral-700 mb-1">
            Monthly Price (€ / month)
          </label>
          <CurrencyInput
            id="pkg-price-input"
            value={priceEUR}
            onChange={setPriceEUR}
            currencySymbol="€"
            suffix="/ mo"
            min={0}
            max={MAX_EUR_PRICE}
            required
            testId="pkg-price-input"
            ariaInvalid={(priceEUR === '' || priceEUR > MAX_EUR_PRICE) && formError !== null}
          />
          <p className="text-[11px] text-neutral-400 mt-1">
            Changes update /workstations, Builder, and widget immediately. Existing bookings retain their original rate.
          </p>
        </div>

        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="pkg-feature-input" className="block font-semibold text-[var(--color-text-on-light)]">
              Included Features
            </label>
            <span className="text-[11px] text-[var(--color-text-on-light-muted)]">
              {features.length}/{MAX_FEATURES_COUNT}
            </span>
          </div>

          {features.length > 0 && (
            <div
              data-testid="pkg-features-list"
              className="flex flex-wrap gap-1.5 mb-2 p-2.5 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-muted)]"
            >
              {features.map((feat, idx) => (
                <span
                  key={`${feat}-${idx}`}
                  data-testid={`pkg-feature-chip-${idx}`}
                  className="inline-flex items-center gap-1.5 max-w-full rounded-full border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-on-light)] shadow-2xs"
                >
                  <span className="truncate">{feat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    aria-label={`Remove feature ${feat}`}
                    data-testid={`pkg-feature-remove-${idx}`}
                    className="inline-flex items-center justify-center rounded-full p-0.5 text-[var(--color-text-on-light-muted)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="pkg-feature-input"
              type="text"
              value={featureDraft}
              onChange={(e) => {
                setFeatureDraft(e.target.value);
                if (featureError) setFeatureError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Enter in the chip input must not submit the package form
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
              placeholder="Type a feature and press Enter..."
              data-testid="pkg-feature-input"
              aria-invalid={featureError ? true : undefined}
              className="flex-1 min-w-0 min-h-10 px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] text-xs text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={handleAddFeature}
              disabled={!featureDraft.trim()}
              data-testid="pkg-feature-add-btn"
              className="inline-flex items-center gap-1 min-h-10 px-3.5 py-2 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light-alt)] text-xs font-semibold text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {featureError ? (
            <p role="alert" data-testid="pkg-feature-error" className="text-[11px] text-[var(--color-error)] mt-1">
              {featureError}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--color-text-on-light-muted)] mt-1">
              Press Enter or click Add to include a feature (max {MAX_FEATURE_LENGTH} chars, up to {MAX_FEATURES_COUNT} items).
            </p>
          )}
        </div>

        <VisibilityCheckbox
          checked={draft.isActive !== false}
          onChange={(checked) => setDraft((prev) => ({ ...prev, isActive: checked }))}
        />

        <WorkstationModalFooter
          isSubmitting={isSubmitting}
          submitLabel="Save Package"
          onCancel={onClose}
          submitTestId="save-pkg-btn"
        />
      </form>
    </WorkstationModalFrame>
  );
}
