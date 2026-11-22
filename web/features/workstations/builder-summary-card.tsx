'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SummaryBreakdownItem {
  name: string;
  priceEUR: number;
}

interface BuilderSummaryCardProps {
  totalUpgradeEUR: number;
  breakdownItems: SummaryBreakdownItem[];
  destinationUrl: string;
  onReset: () => void;
  onApplyProPreset: () => void;
  proPriceEUR?: number;
  isProPreset?: boolean;
}

function formatEurValue(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function formatSignedEur(amount: number, forceDecimals = false): string {
  const sign = amount < 0 ? '-' : '+';
  const abs = Math.abs(amount);
  const formatted = forceDecimals ? abs.toFixed(2) : formatEurValue(abs);
  return `${sign}€${formatted}`;
}

export function BuilderSummaryCard({
  totalUpgradeEUR,
  breakdownItems,
  destinationUrl,
  onReset,
  onApplyProPreset,
  proPriceEUR = 150,
  isProPreset = false,
}: BuilderSummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[var(--color-border-light)] shadow-md sticky top-28">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-light)]">
        <h3 className="font-bold text-lg text-[var(--color-text-on-light)]">
          Configuration Summary
        </h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)] flex items-center gap-1 transition-colors cursor-pointer"
          title="Reset to Comfort Base"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Preset Quick Actions */}
      <div className="mb-5 p-3 rounded-xl bg-[var(--color-bg-light-alt)] border border-[var(--color-border-light)]">
        <span className="text-xs font-semibold text-[var(--color-text-on-light-muted)] block mb-2 uppercase tracking-wider">
          Quick Setup Preset
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReset}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer',
              totalUpgradeEUR === 0
                ? 'bg-white text-[var(--color-text-on-light)] border-neutral-400 shadow-xs'
                : 'bg-transparent text-[var(--color-text-on-light-muted)] border-neutral-300 hover:bg-white',
            )}
          >
            Comfort (€0)
          </button>
          <button
            type="button"
            onClick={onApplyProPreset}
            data-testid="preset-pro-btn"
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer',
              isProPreset
                ? 'bg-[var(--color-brand)] text-white border-transparent shadow-xs'
                : 'bg-transparent text-[var(--color-brand)] border-[var(--color-brand)]/40 hover:bg-orange-50',
            )}
          >
            <Zap className="w-3 h-3" />
            <span>Pro (+€{formatEurValue(proPriceEUR)})</span>
          </button>
        </div>
      </div>

      {/* Breakdown Items List */}
      <div className="space-y-2.5 text-sm mb-6">
        <div className="flex justify-between items-center text-[var(--color-text-on-light)]">
          <span className="text-[var(--color-text-on-light-muted)]">Base Package</span>
          <span className="font-semibold text-emerald-700">€0.00 (Included)</span>
        </div>

        {breakdownItems.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="flex justify-between items-center text-xs sm:text-sm text-[var(--color-text-on-light)]"
          >
            <span className="truncate pr-2 text-neutral-700">{item.name}</span>
            <span className="font-medium text-[var(--color-brand)] shrink-0">
              {formatSignedEur(item.priceEUR, true)}
            </span>
          </div>
        ))}
      </div>

      {/* Hardware Upgrade Total */}
      <div className="border-t border-[var(--color-border-light)] pt-4 mb-6">
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-sm text-[var(--color-text-on-light)]">
            Hardware Upgrade Total
          </span>
          <div className="text-right">
            <span
              data-testid="upgrade-total"
              className="font-bold text-xl text-[var(--color-brand)] block"
            >
              {totalUpgradeEUR === 0
                ? '€0/month'
                : `${formatSignedEur(totalUpgradeEUR)}/month`}
            </span>
            <span className="text-[11px] text-[var(--color-text-on-light-muted)]">
              {totalUpgradeEUR === 0
                ? 'Standard Comfort Included'
                : `${formatSignedEur(totalUpgradeEUR, true)} / mo`}
            </span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        asChild
        size="lg"
        pill
        className="w-full justify-center shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
      >
        <Link
          href={destinationUrl}
          data-testid="browse-with-setup-btn"
          className="flex items-center justify-center gap-2"
        >
          <span>Browse apartments with this setup</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      </Button>

      <p className="text-[11px] text-center text-[var(--color-text-on-light-muted)] mt-3">
        Your selected setup will be installed and verified before check-in.
      </p>
    </div>
  );
}
