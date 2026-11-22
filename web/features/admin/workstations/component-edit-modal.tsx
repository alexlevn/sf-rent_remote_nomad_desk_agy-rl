'use client';

import React, { useRef, useState } from 'react';
import type { WorkstationComponentOption } from '@/lib/types';
import { saveWorkstationComponentAction } from '@/app/admin/cms-actions';
import { CurrencyInput } from '@/features/media/currency-input';
import { MAX_EUR_PRICE, isValidEurPrice, type ComponentCategory } from './constants';
import {
  VisibilityCheckbox,
  WorkstationModalFooter,
  WorkstationModalFrame,
} from './workstation-modal-frame';

export interface ComponentModalTarget {
  isNew: boolean;
  category: ComponentCategory;
  item: Partial<WorkstationComponentOption>;
}

interface ComponentEditModalProps {
  target: ComponentModalTarget;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}

export function ComponentEditModal({ target, onClose, onSaved }: ComponentEditModalProps) {
  const [draft, setDraft] = useState<Partial<WorkstationComponentOption>>(() => ({ ...target.item }));
  const [category, setCategory] = useState<ComponentCategory>(target.category);
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
      setFormError('Please enter a valid monthly upgrade price in EUR (0 for included).');
      return;
    }

    isSavingRef.current = true;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveWorkstationComponentAction(category, {
        // Fallback id is generated at submit time (event handler), never during render
        id: draft.id || `comp-${Date.now()}`,
        name: draft.name,
        pricePerMonth: Math.round(priceEUR * 100),
        isIncluded: draft.isIncluded ?? false,
        description: draft.description || '',
        isActive: draft.isActive !== false,
      });
      await onSaved(`Component "${draft.name}" saved successfully.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save component');
    } finally {
      setIsSubmitting(false);
      isSavingRef.current = false;
    }
  };

  return (
    <WorkstationModalFrame
      ariaLabel={target.isNew ? 'Add Hardware Component' : `Edit Component: ${draft.name || ''}`}
      title={target.isNew ? 'Add Hardware Component' : `Edit Component${draft.name ? `: ${draft.name}` : ''}`}
      isBusy={isSubmitting}
      error={formError}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Hardware Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory)}
            className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          >
            <option value="monitor">Monitor Display</option>
            <option value="chair">Ergonomic Chair</option>
            <option value="desk">Work Desk</option>
            <option value="keyboardMouse">Keyboard &amp; Mouse</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-neutral-700 mb-1">Component Name</label>
          <input
            type="text"
            required
            value={draft.name || ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. 4K Curved Ultrawide Display"
            className="w-full p-2.5 rounded-xl border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="comp-price-input" className="block font-semibold text-neutral-700 mb-1">
            Monthly Upgrade Price (€/mo)
          </label>
          <CurrencyInput
            id="comp-price-input"
            value={priceEUR}
            onChange={setPriceEUR}
            currencySymbol="€"
            suffix="/ mo"
            placeholder="0 for included base hardware"
            min={0}
            max={MAX_EUR_PRICE}
            required
            testId="comp-price-input"
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

        <WorkstationModalFooter isSubmitting={isSubmitting} submitLabel="Save Component" onCancel={onClose} />
      </form>
    </WorkstationModalFrame>
  );
}
