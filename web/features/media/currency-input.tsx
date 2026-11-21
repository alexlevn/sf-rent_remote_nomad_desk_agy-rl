'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

const INTEGER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export interface CurrencyInputProps {
  id?: string;
  value: number | '';
  onChange: (val: number | '') => void;
  currencySymbol: '$' | '€';
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  testId?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function formatCurrencyInteger(value: number | ''): string {
  if (value === '' || !Number.isFinite(value)) return '';
  return INTEGER_FORMATTER.format(Math.trunc(value));
}

function parseCurrencyDraft(raw: string): number | '' {
  const digits = raw.replace(/[,\s]/g, '');
  if (digits.length === 0) return '';
  if (!/^\d+$/.test(digits)) return '';
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(parsed)) return '';
  return parsed;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  currencySymbol,
  suffix,
  placeholder = '0',
  min,
  max,
  testId,
  ariaInvalid,
  ariaLabel,
  ariaDescribedBy,
  required,
  disabled,
  className,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draftText, setDraftText] = useState('');

  // Derive displayed text so external prop resets stay in sync without remounting
  const displayedValue = isFocused
    ? parseCurrencyDraft(draftText) === value
      ? draftText
      : value === ''
        ? ''
        : String(value)
    : formatCurrencyInteger(value);

  const handleFocus = () => {
    setDraftText(value === '' ? '' : String(value));
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    // Allow digits, commas, and spaces during typing or paste/Playwright fill
    const sanitized = raw.replace(/[^0-9,\s]/g, '');
    const digitsOnly = sanitized.replace(/[,\s]/g, '');

    if (digitsOnly.length === 0) {
      setDraftText('');
      onChange('');
      return;
    }

    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isSafeInteger(parsed)) {
      return;
    }

    setDraftText(sanitized);
    onChange(parsed);
  };

  return (
    <div
      className={cn(
        'relative flex items-center rounded-lg border bg-[var(--color-bg-light-surface)] transition-colors focus-within:ring-2 focus-within:ring-[var(--color-brand)] focus-within:border-[var(--color-brand)]',
        ariaInvalid
          ? 'border-[var(--color-error)]'
          : 'border-[var(--color-border-light)]',
        disabled && 'opacity-60 cursor-not-allowed bg-[var(--color-surface-muted)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pl-3 pr-1.5 text-sm font-semibold text-[var(--color-text-on-light-muted)] select-none pointer-events-none"
      >
        {currencySymbol}
      </span>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={displayedValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        data-testid={testId}
        aria-invalid={ariaInvalid || undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        data-min={min}
        data-max={max}
        required={required}
        disabled={disabled}
        className={cn(
          'w-full min-w-0 min-h-10 bg-transparent py-2 text-sm text-[var(--color-text-on-light)] placeholder:text-[var(--color-text-light-subtle)] focus:outline-none',
          suffix ? 'pr-2' : 'pr-3',
          disabled && 'cursor-not-allowed',
        )}
      />

      {suffix && (
        <span
          aria-hidden="true"
          className="pr-3 pl-1 text-xs font-medium text-[var(--color-text-on-light-muted)] whitespace-nowrap select-none pointer-events-none"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
