'use client';

import React, { useRef, useState } from 'react';
import type { WorkstationAddon } from '@/lib/types';
import { saveWorkstationAddonAction } from '@/app/admin/cms-actions';
import { CurrencyInput } from '@/features/media/currency-input';
import { MAX_EUR_PRICE, isValidEurPrice } from './constants';
import {
  VisibilityCheckbox,
  WorkstationModalFooter,
  WorkstationModalFrame,
} from './workstation-modal-frame';

export interface AddonModalTarget {
  isNew: boolean;
  item: Partial<WorkstationAddon>;
}

interface AddonEditModalProps {
  target: AddonModalTarget;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}

export function AddonEditModal({ target, onClose, onSaved }: AddonEditModalProps) {
  const [draft, setDraft] = useState<Partial<WorkstationAddon>>(() => ({ ...target.item }));
  const [priceEUR, setPriceEUR] = useState<number | ''>(() =>
    Math.round((target.item.pricePerMonth ?? 0) / 100)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSavingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name || isSavingRef.current) return;

    if (!isValidEurPrice(priceEUR)) {
      setFormError('Please enter a valid monthly add-on price in EUR.');
      return;
    }

    isSavingRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveWorkstationAddonAction({
        id: draft.id || `addon-${Date.now()}`,
        name: draft.name,
        pricePerMonth: Math.round(priceEUR * 100),
        description: draft.description || '',
        isActive: draft.isActive !== false,
      });
      await onSaved(`Add-on "${draft.name}" saved successfully.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save add-on');
    } finally {
      setIsSubmitting(false);
      isSavingRef.current = false;
    }
  };

  return (
    <WorkstationModalFrame
      ariaLabel={target.isNew ? 'Add Accessory Add-on' : `Edit Add-on: ${draft.name || ''}`}
      title={target.isNew ? 'Add Accessory Add-on' : `Edit Add-on${draft.name ? `: ${draft.name}` : ''}`}
      isBusy={isSubmitting}
      error={formError}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Accessory Name</label>
          <input
            type="text"
            required
            value={draft.name || ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Studio Microphone"
            className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="addon-price-input" className="block font-semibold text-neutral-700 mb-1">
            Monthly Add-on Price (€/mo)
          </label>
          <CurrencyInput
            id="addon-price-input"
            value={priceEUR}
            onChange={setPriceEUR}
            currencySymbol="€"
            suffix="/ mo"
            placeholder="20"
            min={0}
            max={MAX_EUR_PRICE}
            required
            testId="addon-price-input"
            ariaInvalid={(priceEUR === '' || priceEUR > MAX_EUR_PRICE) && formError !== null}
          />
        </div>

        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={draft.description || ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
          />
        </div>

        <VisibilityCheckbox
          checked={draft.isActive !== false}
          onChange={(checked) => setDraft((prev) => ({ ...prev, isActive: checked }))}
        />

        <WorkstationModalFooter isSubmitting={isSubmitting} submitLabel="Save Accessory" onCancel={onClose} />
      </form>
    </WorkstationModalFrame>
  );
}
