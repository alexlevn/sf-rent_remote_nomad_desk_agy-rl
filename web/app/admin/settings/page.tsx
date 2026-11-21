import React from 'react';
import { CurrencyRatesForm } from '@/features/admin/currency-rates-form';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">Platform Settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          FX & Business Settings
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Configure real-time currency conversion rates, review platform commission policies, and financial parameters.
        </p>
      </div>

      <CurrencyRatesForm />
    </div>
  );
}
