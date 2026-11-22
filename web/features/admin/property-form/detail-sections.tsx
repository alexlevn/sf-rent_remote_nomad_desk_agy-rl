'use client';

import React from 'react';
import { CalendarCheck, DollarSign, Laptop, Sliders } from 'lucide-react';
import { CurrencyInput } from '@/features/media/currency-input';
import { cn } from '@/lib/utils';
import type { AdminPropertyFormValues, AdminPropertySectionProps } from './form-values';
import { CardHeader, CardTitle, FieldError, RequiredMark, cardClass, inputClass, labelClass } from './form-ui';

interface BookingModeOptionProps {
  active: boolean;
  testId: string;
  title: string;
  description: string;
  onSelect: () => void;
}

function BookingModeOption({ active, testId, title, description, onSelect }: BookingModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
        active
          ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
          : 'border-[var(--color-border-light)] hover:bg-neutral-50',
      )}
    >
      <CalendarCheck
        className={cn('w-5 h-5 shrink-0 mt-0.5', active ? 'text-[var(--color-brand)]' : 'text-neutral-400')}
      />
      <div>
        <div className="text-sm font-semibold text-[var(--color-text-on-light)]">{title}</div>
        <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export function PricingSection({ values, errors, setField }: AdminPropertySectionProps) {
  return (
    <section className={cardClass}>
      <CardHeader icon={DollarSign}>Pricing, Stay Rules & Booking Mode</CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="property-price" className={labelClass}>
            Monthly Rent (USD) <RequiredMark />
          </label>
          <CurrencyInput
            id="property-price"
            value={values.monthlyRentUsd}
            onChange={(val) => setField('monthlyRentUsd', val)}
            currencySymbol="$"
            suffix="/ mo"
            min={1}
            placeholder="2,800"
            testId="property-price-input"
            ariaInvalid={Boolean(errors.monthlyRentUsd)}
            required
          />
          <FieldError message={errors.monthlyRentUsd} />
        </div>

        <div>
          <label htmlFor="property-min-stay" className={labelClass}>
            Minimum Stay (Nights ≥ 30) <RequiredMark />
          </label>
          <input
            id="property-min-stay"
            data-testid="property-min-stay-input"
            type="number"
            min={30}
            max={3650}
            step={1}
            value={values.minimumStayNights}
            onChange={(e) => setField('minimumStayNights', e.target.value)}
            className={inputClass}
            required
          />
          <FieldError message={errors.minimumStayNights} />
        </div>

        <div>
          <label htmlFor="property-checkin" className={labelClass}>
            Check-in Start
          </label>
          <input
            id="property-checkin"
            type="text"
            value={values.checkInStart}
            onChange={(e) => setField('checkInStart', e.target.value)}
            placeholder="15:00"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="property-checkout" className={labelClass}>
            Check-out Time
          </label>
          <input
            id="property-checkout"
            type="text"
            value={values.checkOut}
            onChange={(e) => setField('checkOut', e.target.value)}
            placeholder="11:00"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className={labelClass}>Booking Mode</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BookingModeOption
            active={values.isDirectBooking}
            testId="booking-mode-instant"
            title="Instant Booking"
            description="Guests confirm immediately upon checkout without waiting for host approval."
            onSelect={() => setField('isDirectBooking', true)}
          />
          <BookingModeOption
            active={!values.isDirectBooking}
            testId="booking-mode-request"
            title="Request to Book"
            description="Host has 48 hours to review and accept or decline each reservation request."
            onSelect={() => setField('isDirectBooking', false)}
          />
        </div>
      </div>
    </section>
  );
}

type NumericSpecKey = 'bedrooms' | 'bathrooms' | 'bedsCount' | 'totalSurface' | 'maxGuests';
type AmenityKey = 'kitchen' | 'laundry' | 'balcony' | 'petFriendly' | 'pool' | 'gym' | 'terrace';

const SPEC_FIELDS: ReadonlyArray<{ key: NumericSpecKey; id: string; label: string; min: number; max: number }> = [
  { key: 'bedrooms', id: 'property-bedrooms', label: 'Bedrooms', min: 0, max: 50 },
  { key: 'bathrooms', id: 'property-bathrooms', label: 'Bathrooms', min: 0, max: 50 },
  { key: 'bedsCount', id: 'property-beds', label: 'Beds', min: 0, max: 50 },
  { key: 'totalSurface', id: 'property-surface', label: 'Surface (m²)', min: 0, max: 100000 },
  { key: 'maxGuests', id: 'property-max-guests', label: 'Max Guests', min: 1, max: 50 },
];

const AMENITY_FIELDS: ReadonlyArray<{ key: AmenityKey; label: string }> = [
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'petFriendly', label: 'Pet Friendly' },
  { key: 'pool', label: 'Pool' },
  { key: 'gym', label: 'Gym' },
  { key: 'terrace', label: 'Terrace' },
];

export function SpecsSection({ values, errors, setField }: AdminPropertySectionProps) {
  return (
    <section className={cardClass}>
      <CardHeader icon={Sliders}>Property Specs & Amenities</CardHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {SPEC_FIELDS.map(({ key, id, label, min, max }) => (
          <div key={key}>
            <label htmlFor={id} className={labelClass}>
              {label}
            </label>
            <input
              id={id}
              type="number"
              min={min}
              max={max}
              value={values[key]}
              onChange={(e) => setField(key, e.target.value)}
              className={inputClass}
            />
            <FieldError message={errors[key]} />
          </div>
        ))}
      </div>

      <div>
        <span className={labelClass}>Included Amenities</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1.5">
          {AMENITY_FIELDS.map(({ key, label }) => {
            const checked = values[key];
            return (
              <label
                key={key}
                className={cn(
                  'flex min-h-10 items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                  checked
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] text-[var(--color-text-on-light)] hover:bg-neutral-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setField(key, e.target.checked)}
                  className="accent-[var(--color-brand)]"
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type WorkstationTextKey = keyof Pick<AdminPropertyFormValues, 'desk' | 'chair' | 'monitors'>;

const WORKSTATION_TEXT_FIELDS: ReadonlyArray<{ key: WorkstationTextKey; id: string; label: string; placeholder: string }> = [
  { key: 'desk', id: 'ws-desk', label: 'Desk', placeholder: 'e.g. Ergonomic Standing Desk' },
  { key: 'chair', id: 'ws-chair', label: 'Chair', placeholder: 'e.g. Herman Miller Aeron' },
  { key: 'monitors', id: 'ws-monitors', label: 'Monitor(s)', placeholder: 'e.g. Dual 27" 4K UHD Monitors' },
];

export function WorkstationSection({ values, errors, setField }: AdminPropertySectionProps) {
  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-light)]">
        <CardTitle icon={Laptop}>Remote Workstation Specs</CardTitle>

        <label className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[var(--color-text-on-light)] cursor-pointer">
          <input
            type="checkbox"
            checked={values.hasWorkstation}
            onChange={(e) => setField('hasWorkstation', e.target.checked)}
            className="accent-[var(--color-brand)]"
          />
          <span>Includes Dedicated Workstation</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WORKSTATION_TEXT_FIELDS.map(({ key, id, label, placeholder }) => (
          <div key={key}>
            <label htmlFor={id} className={labelClass}>
              {label}
            </label>
            <input
              id={id}
              type="text"
              value={values[key]}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={placeholder}
              className={inputClass}
            />
          </div>
        ))}

        <div>
          <label htmlFor="ws-wifi" className={labelClass}>
            Verified Wi-Fi Speed (Mbps)
          </label>
          <input
            id="ws-wifi"
            type="number"
            min={0}
            max={100000}
            value={values.wifiSpeed}
            onChange={(e) => setField('wifiSpeed', e.target.value)}
            className={inputClass}
          />
          <FieldError message={errors.wifiSpeed} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="ws-keyboard" className={labelClass}>
            Keyboard & Peripherals
          </label>
          <input
            id="ws-keyboard"
            type="text"
            value={values.keyboard}
            onChange={(e) => setField('keyboard', e.target.value)}
            placeholder="e.g. Mechanical Keyboard & Wireless Mouse"
            className={inputClass}
          />
        </div>
      </div>
    </section>
  );
}
