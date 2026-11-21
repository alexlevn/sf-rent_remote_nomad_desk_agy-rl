'use client';

import React, { useEffect } from 'react';

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface GuestInfoFormProps {
  info: GuestInfo;
  onChange: (field: keyof GuestInfo, value: string) => void;
  disabled?: boolean;
}

export const GuestInfoForm: React.FC<GuestInfoFormProps> = ({
  info,
  onChange,
  disabled = false,
}) => {
  // Auto-fill from localStorage if guest is logged in and fields are still default/empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nomaddesk_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user) {
          if (!info.firstName && user.firstName) {
            onChange('firstName', user.firstName);
          } else if (!info.firstName && user.name) {
            const parts = user.name.split(' ');
            onChange('firstName', parts[0] || '');
            if (parts.length > 1 && !info.lastName) {
              onChange('lastName', parts.slice(1).join(' '));
            }
          }
          if (!info.lastName && user.lastName) {
            onChange('lastName', user.lastName);
          }
          if (!info.email && user.email) {
            onChange('email', user.email);
          }
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [info.firstName, info.lastName, info.email, onChange]);

  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 shadow-xs mb-6">
      <h2 className="text-lg font-bold text-[var(--color-text-on-light)] tracking-tight mb-4">
        1. Guest Information
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="guest-first-name"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            First Name
          </label>
          <input
            id="guest-first-name"
            name="firstName"
            type="text"
            required
            disabled={disabled}
            value={info.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="Alex"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>

        <div>
          <label
            htmlFor="guest-last-name"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Last Name
          </label>
          <input
            id="guest-last-name"
            name="lastName"
            type="text"
            required
            disabled={disabled}
            value={info.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Le"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="guest-email"
          className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
        >
          Email Address <span className="text-[var(--color-text-on-light-muted)] font-normal">(for keys and receipts)</span>
        </label>
        <input
          id="guest-email"
          name="email"
          type="email"
          required
          disabled={disabled}
          value={info.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="demo@example.com"
          className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400"
        />
      </div>

      <div>
        <label
          htmlFor="guest-phone"
          className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
        >
          Phone Number <span className="text-[var(--color-text-on-light-muted)] font-normal">(WhatsApp for Host arrival coordination)</span>
        </label>
        <input
          id="guest-phone"
          name="phone"
          type="tel"
          required
          disabled={disabled}
          value={info.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="+1 (555) 234-5678"
          className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all disabled:bg-neutral-50 disabled:text-neutral-400"
        />
      </div>
    </div>
  );
};
