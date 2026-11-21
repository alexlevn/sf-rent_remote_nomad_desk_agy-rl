'use client';

import React from 'react';
import { Monitor, Armchair, MoveVertical, Keyboard, Sparkles } from 'lucide-react';
import type {
  WorkstationComponents,
  WorkstationAddon,
  WorkstationComponentOption,
} from '@/lib/types';

interface BuilderHardwarePickerProps {
  components: WorkstationComponents;
  addons: WorkstationAddon[];
  selectedMonitor: string;
  onSelectMonitor: (id: string) => void;
  selectedChair: string;
  onSelectChair: (id: string) => void;
  selectedDesk: string;
  onSelectDesk: (id: string) => void;
  selectedKeyboardMouse: string;
  onSelectKeyboardMouse: (id: string) => void;
  selectedAddons: string[];
  onToggleAddon: (id: string) => void;
}

export function BuilderHardwarePicker({
  components,
  addons,
  selectedMonitor,
  onSelectMonitor,
  selectedChair,
  onSelectChair,
  selectedDesk,
  onSelectDesk,
  selectedKeyboardMouse,
  onSelectKeyboardMouse,
  selectedAddons,
  onToggleAddon,
}: BuilderHardwarePickerProps) {
  // Helpers for displaying options clearly
  const formatOptionTitle = (type: 'monitor' | 'chair' | 'desk' | 'keyboardMouse', opt: WorkstationComponentOption) => {
    if (type === 'monitor') {
      if (opt.id === 'mon-4k-ultrawide') return '4K UHD Ultrawide Monitor';
      if (opt.id === 'mon-ultrawide') return 'Single 27" 4K UHD Display (Comfort Base)';
    }
    if (type === 'chair') {
      if (opt.id === 'chair-aeron') return 'Herman Miller Aeron (Fully Adjustable)';
      if (opt.id === 'chair-ergo') return 'Standard Ergonomic Breathable Mesh Chair';
    }
    if (type === 'desk') {
      if (opt.id === 'desk-standing') return 'Dual-Motor Electric Standing Desk';
      if (opt.id === 'desk-std') return 'Solid Oak Work Desk (120 x 60 cm)';
    }
    if (type === 'keyboardMouse') {
      if (opt.id === 'km-mx') return 'Logitech MX Master 3S + Mechanical Wireless Keyboard';
      if (opt.id === 'km-none') return 'Standard Full-Sized Keyboard & Wireless Precision Mouse';
    }
    return opt.name;
  };

  const formatPriceBadge = (priceEURCents: number) => {
    if (priceEURCents === 0) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-bg-light-alt)] text-[var(--color-text-on-light-muted)] border border-[var(--color-border-light)]">
          €0
        </span>
      );
    }
    const eur = Math.round(priceEURCents / 100);
    return (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)]/20">
        +€{eur}/mo
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Display & Monitor */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-border-light)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-[var(--color-brand)] flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-on-light)]">
              1. Display & Monitor Configuration
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)]">
              Choose between standard single display or high-resolution ultrawide screen.
            </p>
          </div>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Display & Monitor Configuration">
          {components.monitor.map((opt) => {
            const isSelected = selectedMonitor === opt.id;
            const title = formatOptionTitle('monitor', opt);
            return (
              <label
                key={opt.id}
                data-testid={`option-${opt.id}`}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] ring-1 ring-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3 pr-2">
                  <input
                    type="radio"
                    name="monitor"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => onSelectMonitor(opt.id)}
                    className="w-4 h-4 text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-text-on-light)] block">
                      {title}
                    </span>
                    <span className="text-xs text-[var(--color-text-on-light-muted)]">
                      {opt.description}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">{formatPriceBadge(opt.pricePerMonth)}</div>
              </label>
            );
          })}
        </div>
      </section>

      {/* 2. Ergonomic Seating */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-border-light)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-[var(--color-brand)] flex items-center justify-center shrink-0">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-on-light)]">
              2. Ergonomic Seating
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)]">
              Upgrade to the benchmark Herman Miller Aeron chair for posture health during full workdays.
            </p>
          </div>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Ergonomic Seating">
          {components.chair.map((opt) => {
            const isSelected = selectedChair === opt.id;
            const title = formatOptionTitle('chair', opt);
            return (
              <label
                key={opt.id}
                data-testid={`option-${opt.id}`}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] ring-1 ring-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3 pr-2">
                  <input
                    type="radio"
                    name="chair"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => onSelectChair(opt.id)}
                    className="w-4 h-4 text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-text-on-light)] block">
                      {title}
                    </span>
                    <span className="text-xs text-[var(--color-text-on-light-muted)]">
                      {opt.description}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">{formatPriceBadge(opt.pricePerMonth)}</div>
              </label>
            );
          })}
        </div>
      </section>

      {/* 3. Desk Configuration */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-border-light)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-[var(--color-brand)] flex items-center justify-center shrink-0">
            <MoveVertical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-on-light)]">
              3. Desk Configuration
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)]">
              Choose standard solid oak or motorized sit-to-stand desk with presets.
            </p>
          </div>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Desk Configuration">
          {components.desk.map((opt) => {
            const isSelected = selectedDesk === opt.id;
            const title = formatOptionTitle('desk', opt);
            return (
              <label
                key={opt.id}
                data-testid={`option-${opt.id}`}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] ring-1 ring-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3 pr-2">
                  <input
                    type="radio"
                    name="desk"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => onSelectDesk(opt.id)}
                    className="w-4 h-4 text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-text-on-light)] block">
                      {title}
                    </span>
                    <span className="text-xs text-[var(--color-text-on-light-muted)]">
                      {opt.description}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">{formatPriceBadge(opt.pricePerMonth)}</div>
              </label>
            );
          })}
        </div>
      </section>

      {/* 4. Keyboard & Mouse */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-border-light)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-[var(--color-brand)] flex items-center justify-center shrink-0">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-on-light)]">
              4. Keyboard & Precision Mouse
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)]">
              Opt for standard peripherals or the industry-standard Logitech MX Master ecosystem.
            </p>
          </div>
        </div>

        <div className="space-y-3" role="radiogroup" aria-label="Keyboard & Mouse">
          {components.keyboardMouse.map((opt) => {
            const isSelected = selectedKeyboardMouse === opt.id;
            const title = formatOptionTitle('keyboardMouse', opt);
            return (
              <label
                key={opt.id}
                data-testid={`option-${opt.id}`}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] ring-1 ring-[var(--color-brand)]'
                    : 'border-[var(--color-border-light)] bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3 pr-2">
                  <input
                    type="radio"
                    name="keyboardMouse"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => onSelectKeyboardMouse(opt.id)}
                    className="w-4 h-4 text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-text-on-light)] block">
                      {title}
                    </span>
                    <span className="text-xs text-[var(--color-text-on-light-muted)]">
                      {opt.description}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">{formatPriceBadge(opt.pricePerMonth)}</div>
              </label>
            );
          })}
        </div>
      </section>

      {/* 5. Studio & Productivity Accessories */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-border-light)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-[var(--color-brand)] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-on-light)]">
              5. Studio & Productivity Add-ons
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)]">
              Select any additional studio accessories to customize your setup.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-surface-muted)]">
          {addons.map((addon) => {
            const isChecked = selectedAddons.includes(addon.id);
            const eur = Math.round(addon.pricePerMonth / 100);
            return (
              <label
                key={addon.id}
                data-testid={`addon-${addon.id}`}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-[var(--color-bg-light)] rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 pr-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleAddon(addon.id)}
                    className="w-4 h-4 text-[var(--color-brand)] rounded border-neutral-300 focus:ring-[var(--color-brand)] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--color-text-on-light)] block">
                      {addon.name}
                    </span>
                    <span className="text-xs text-[var(--color-text-on-light-muted)]">
                      {addon.description}
                    </span>
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[var(--color-brand)] shrink-0">
                  +€{eur}/mo
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
