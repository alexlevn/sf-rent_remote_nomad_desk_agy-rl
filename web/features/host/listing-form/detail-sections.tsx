'use client';

import React from 'react';
import { DollarSign, Laptop, Sliders } from 'lucide-react';
import { TiptapEditor } from '@/features/admin/tiptap-editor';
import { CurrencyInput } from '@/features/media/currency-input';
import type { HostListingSectionProps } from './form-values';
import {
  FieldError,
  RequiredMark,
  SectionHeader,
  compactNumberClass,
  labelClass,
  plainInputClass,
  validatedInputClass,
} from './form-ui';

type SpecKey = 'bedrooms' | 'bathrooms' | 'totalSurface' | 'maxGuests' | 'bedsCount';
type AmenityKey = 'kitchen' | 'laundry' | 'balcony' | 'petFriendly' | 'pool' | 'gym' | 'terrace';

const SPEC_FIELDS: ReadonlyArray<{ key: SpecKey; id: string; label: string; min: string; max: string }> = [
  { key: 'bedrooms', id: 'specs-bedrooms', label: 'Bedrooms', min: '0', max: '10' },
  { key: 'bathrooms', id: 'specs-bathrooms', label: 'Bathrooms', min: '1', max: '10' },
  { key: 'totalSurface', id: 'specs-surface', label: 'Total Area (m²)', min: '15', max: '1000' },
  { key: 'maxGuests', id: 'specs-guests', label: 'Max Guests', min: '1', max: '20' },
  { key: 'bedsCount', id: 'specs-beds', label: 'Beds Count', min: '1', max: '10' },
];

const AMENITY_FIELDS: ReadonlyArray<{ key: AmenityKey; label: string }> = [
  { key: 'kitchen', label: 'Full Kitchen' },
  { key: 'laundry', label: 'In-unit Laundry' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'petFriendly', label: 'Pet-Friendly' },
  { key: 'pool', label: 'Swimming Pool' },
  { key: 'gym', label: 'Fitness Gym' },
  { key: 'terrace', label: 'Private Terrace' },
];

export function ListingSpecsSection({ values, setField }: Omit<HostListingSectionProps, 'errors'>) {
  return (
    <section aria-labelledby="section-details">
      <SectionHeader id="section-details" icon={Sliders}>
        3. Property Specifications & Amenities
      </SectionHeader>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {SPEC_FIELDS.map(({ key, id, label, min, max }) => (
          <div key={key}>
            <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              {label}
            </label>
            <input
              id={id}
              type="number"
              min={min}
              max={max}
              value={values[key]}
              onChange={(e) => setField(key, Number(e.target.value))}
              className={compactNumberClass}
            />
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
          Included Amenities & Features
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AMENITY_FIELDS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-medium text-neutral-800"
            >
              <input
                type="checkbox"
                checked={values[key]}
                onChange={(e) => setField(key, e.target.checked)}
                className="rounded border-neutral-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)] w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ListingWorkstationSection({ values, errors, setField }: HostListingSectionProps) {
  return (
    <section aria-labelledby="section-workstation">
      <SectionHeader id="section-workstation" icon={Laptop}>
        4. Dedicated Workstation Hardware
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="ws-desk" className={labelClass}>
            Desk Spec <RequiredMark />
          </label>
          <input
            id="ws-desk"
            type="text"
            value={values.desk}
            onChange={(e) => setField('desk', e.target.value)}
            placeholder="e.g. Bespoke Executive Standing Desk with Library Wall"
            className={validatedInputClass(Boolean(errors.desk))}
            aria-invalid={Boolean(errors.desk)}
          />
          <FieldError message={errors.desk} />
        </div>

        <div>
          <label htmlFor="ws-chair" className={labelClass}>
            Ergonomic Chair <RequiredMark />
          </label>
          <input
            id="ws-chair"
            type="text"
            value={values.chair}
            onChange={(e) => setField('chair', e.target.value)}
            placeholder="e.g. Herman Miller Aeron / Ergonomic Executive Seating"
            className={validatedInputClass(Boolean(errors.chair))}
            aria-invalid={Boolean(errors.chair)}
          />
          <FieldError message={errors.chair} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="sm:col-span-2">
          <label htmlFor="ws-monitors" className={labelClass}>
            Monitors Setup
          </label>
          <input
            id="ws-monitors"
            type="text"
            value={values.monitors}
            onChange={(e) => setField('monitors', e.target.value)}
            placeholder='e.g. Dual 27" 4K UHD Monitors / 34" Ultrawide'
            className={plainInputClass}
          />
        </div>

        <div>
          <label htmlFor="ws-wifi" className={labelClass}>
            Verified Fiber Speed (Mbps) <RequiredMark />
          </label>
          <input
            id="ws-wifi"
            type="number"
            min="50"
            max="2000"
            value={values.wifiSpeed}
            onChange={(e) => setField('wifiSpeed', Number(e.target.value))}
            className={validatedInputClass(Boolean(errors.wifiSpeed), 'text-sm font-semibold text-neutral-900 text-center')}
            aria-invalid={Boolean(errors.wifiSpeed)}
          />
          <FieldError message={errors.wifiSpeed} />
        </div>
      </div>

      <div>
        <label htmlFor="ws-keyboard" className={labelClass}>
          Keyboard & Peripherals
        </label>
        <input
          id="ws-keyboard"
          type="text"
          value={values.keyboard}
          onChange={(e) => setField('keyboard', e.target.value)}
          placeholder="e.g. Mechanical Keyboard & Wireless Ergonomic Mouse"
          className={plainInputClass}
        />
      </div>
    </section>
  );
}

export function ListingPricingSection({ values, errors, setField }: HostListingSectionProps) {
  return (
    <section aria-labelledby="section-pricing">
      <SectionHeader id="section-pricing" icon={DollarSign}>
        5. Monthly Rate & Booking Rules
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="pricing-monthly" className={labelClass}>
            Monthly Rent (USD $) <RequiredMark />
          </label>
          <CurrencyInput
            id="pricing-monthly"
            value={values.monthlyRentUsd}
            onChange={(val) => setField('monthlyRentUsd', val)}
            currencySymbol="$"
            suffix="/ mo"
            min={1}
            placeholder="2,850"
            testId="host-price-input"
            ariaInvalid={Boolean(errors.monthlyRentUsd)}
            required
          />
          <FieldError message={errors.monthlyRentUsd} asAlert />
        </div>

        <div>
          <label htmlFor="booking-mode-select" className={labelClass}>
            Booking Mode <RequiredMark />
          </label>
          <select
            id="booking-mode-select"
            value={values.isDirectBooking ? 'instant' : 'request'}
            onChange={(e) => setField('isDirectBooking', e.target.value === 'instant')}
            className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 bg-white focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] font-medium"
          >
            <option value="request">Request to Book (Host 48h Approval)</option>
            <option value="instant">Instant Book</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="rules-minstay" className={labelClass}>
            Minimum Stay (Nights)
          </label>
          <input
            id="rules-minstay"
            type="number"
            min="30"
            value={values.minimumStayNights}
            onChange={(e) => setField('minimumStayNights', Number(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 text-center"
          />
          <FieldError message={errors.minimumStayNights} />
        </div>

        <div>
          <label htmlFor="rules-checkin" className={labelClass}>
            Check-in Start
          </label>
          <input
            id="rules-checkin"
            type="text"
            value={values.checkInStart}
            onChange={(e) => setField('checkInStart', e.target.value)}
            placeholder="15:00"
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-900 text-center"
          />
        </div>

        <div>
          <label htmlFor="rules-checkout" className={labelClass}>
            Check-out Time
          </label>
          <input
            id="rules-checkout"
            type="text"
            value={values.checkOut}
            onChange={(e) => setField('checkOut', e.target.value)}
            placeholder="11:00"
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-900 text-center"
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>House Rules & Quiet Hours</span>
        <TiptapEditor
          value={values.houseRules}
          onChange={(html) => setField('houseRules', html)}
          label="House Rules & Quiet Hours"
          placeholder="e.g. No smoking inside. Quiet hours 22:00 - 08:00."
          minHeight="160px"
          editorId="rules-houserules"
          testIdPrefix="host-rules-editor"
        />
      </div>
    </section>
  );
}
