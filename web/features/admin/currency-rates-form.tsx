'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { useCurrency } from '@/context/currency-context';
import {
  fetchExchangeRatesAction,
  updateExchangeRatesAction,
} from '@/app/admin/cms-actions';
import { BOOKING_RULES } from '@/content/booking-rules';
import type { ExchangeRates } from '@/lib/types';
import {
  Coins,
  ShieldCheck,
  Check,
  Info,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';

const FALLBACK_EUR_USD = 1.08;
const FALLBACK_GBP_USD = 1.26;

export function CurrencyRatesForm() {
  const { rates: currentContextRates, updateRates } = useCurrency();
  const [eurRate, setEurRate] = useState(String(currentContextRates.EUR_USD || FALLBACK_EUR_USD));
  const [gbpRate, setGbpRate] = useState(String(currentContextRates.GBP_USD || FALLBACK_GBP_USD));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasEditedRef = useRef(false);
  const isSavingRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing rates once on mount without clobbering user edits in flight
  useEffect(() => {
    let cancelled = false;
    async function loadRates() {
      try {
        const rates = await fetchExchangeRatesAction();
        if (cancelled) return;
        startTransition(() => {
          if (!hasEditedRef.current) {
            setEurRate(rates.EUR_USD.toString());
            setGbpRate(rates.GBP_USD.toString());
          }
          setLoading(false);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          if (!hasEditedRef.current) {
            setEurRate(currentContextRates.EUR_USD.toString());
            setGbpRate(currentContextRates.GBP_USD.toString());
          }
          setLoading(false);
        });
      }
    }
    loadRates();
    return () => {
      cancelled = true;
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isSavingRef.current) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const eurNum = parseFloat(eurRate);
    const gbpNum = parseFloat(gbpRate);

    if (isNaN(eurNum) || eurNum <= 0) {
      setErrorMessage('Please enter a valid positive number for EUR to USD rate.');
      return;
    }
    if (isNaN(gbpNum) || gbpNum <= 0) {
      setErrorMessage('Please enter a valid positive number for GBP to USD rate.');
      return;
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      const updated: Partial<ExchangeRates> = {
        EUR_USD: eurNum,
        GBP_USD: gbpNum,
      };

      // 1. Update database via server action
      await updateExchangeRatesAction(updated);

      // 2. Update client CurrencyContext and trigger storage event
      if (updateRates) {
        updateRates(updated);
      } else {
        localStorage.setItem(
          'nomaddesk_exchange_rates',
          JSON.stringify({ EUR_USD: eurNum, GBP_USD: gbpNum, USD_USD: 1.0 })
        );
        window.dispatchEvent(
          new CustomEvent('nomaddesk_rates_updated', {
            detail: { EUR_USD: eurNum, GBP_USD: gbpNum, USD_USD: 1.0 },
          })
        );
      }

      setSuccessMessage(
        'Currency exchange rates updated successfully! Updated rates take effect immediately across property listings and booking checkout without altering base USD amounts of existing reservations.'
      );
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update rates');
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const parsedEur = parseFloat(eurRate) || FALLBACK_EUR_USD;
  const parsedGbp = parseFloat(gbpRate) || FALLBACK_GBP_USD;
  const sampleUSD = 1000;
  const sampleEUR = Math.round(sampleUSD / parsedEur);
  const sampleGBP = Math.round(sampleUSD / parsedGbp);
  const commissionPercent = BOOKING_RULES.commissionPercent;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Form (2 columns) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-border-light)] p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-on-light)]">
              Currency Exchange Rates
            </h2>
            <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)]">
              Used for on-the-fly currency switching ($ / € / £) across property listings and checkout.
            </p>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="my-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-medium flex items-start gap-2 shadow-sm animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="my-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs md:text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          {/* EUR to USD input */}
          <div>
            <label htmlFor="fx-eur-rate" className="block text-xs font-semibold text-neutral-800 mb-1.5">
              EUR (€) to USD ($) Rate
            </label>
            <div className="relative">
              <input
                id="fx-eur-rate"
                type="text"
                value={eurRate}
                onChange={(e) => {
                  hasEditedRef.current = true;
                  setEurRate(e.target.value);
                }}
                placeholder={String(FALLBACK_EUR_USD)}
                data-testid="eur-rate-input"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-[var(--color-border-light)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all font-mono"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                1 € = ${eurRate}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Specifies how many US Dollars equal 1 Euro (default: {FALLBACK_EUR_USD}).
            </p>
          </div>

          {/* GBP to USD input */}
          <div>
            <label htmlFor="fx-gbp-rate" className="block text-xs font-semibold text-neutral-800 mb-1.5">
              GBP (£) to USD ($) Rate
            </label>
            <div className="relative">
              <input
                id="fx-gbp-rate"
                type="text"
                value={gbpRate}
                onChange={(e) => {
                  hasEditedRef.current = true;
                  setGbpRate(e.target.value);
                }}
                placeholder={String(FALLBACK_GBP_USD)}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-[var(--color-border-light)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all font-mono"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                1 £ = ${gbpRate}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Specifies how many US Dollars equal 1 British Pound (default: {FALLBACK_GBP_USD}).
            </p>
          </div>

          {/* Platform Commission Rate (Readonly) */}
          <div>
            <label htmlFor="fx-commission-rate" className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Platform Host Commission Rate (%)
            </label>
            <input
              id="fx-commission-rate"
              type="number"
              value={commissionPercent}
              readOnly
              className="w-full px-4 py-2.5 bg-neutral-100 border border-[var(--color-border-light)] rounded-xl text-sm font-semibold text-neutral-600 cursor-not-allowed font-mono"
            />
            <span className="block text-[11px] text-neutral-500 mt-1">
              Governed by platform policy. The platform retains {commissionPercent}% commission on rental volume.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              data-testid="save-rates-btn"
              className="px-6 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-xs md:text-sm font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Rates...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Rates</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Live FX Conversion Preview Card */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[var(--color-border-light)] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
            <ArrowRightLeft className="w-4 h-4 text-[var(--color-brand)]" />
            <span>Live FX Preview</span>
          </div>
          <p className="text-xs text-[var(--color-text-on-light-muted)] mb-4">
            Illustrative conversion of a $1,000 USD monthly rent using your current rates:
          </p>

          <div className="space-y-3 font-mono">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <span className="text-xs text-neutral-600">Base Currency (USD)</span>
              <span className="text-sm font-bold text-neutral-900">$1,000.00</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
              <span className="text-xs text-blue-700">Display Euro (EUR)</span>
              <span className="text-sm font-bold text-blue-900">€{sampleEUR.toLocaleString('en-US')}</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between">
              <span className="text-xs text-purple-700">Display Pound (GBP)</span>
              <span className="text-sm font-bold text-purple-900">£{sampleGBP.toLocaleString('en-US')}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] text-[11px] text-neutral-500">
            * Integer USD cents remain the invariant base for all database pricing and host payouts.
          </div>
        </div>

        {/* Business Policy Summary */}
        <div className="bg-white rounded-2xl border border-[var(--color-border-light)] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Platform Policy</span>
          </div>
          <ul className="space-y-2 text-xs text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>{commissionPercent}% Platform fee:</strong> Deducted at source upon monthly host disbursement.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>{BOOKING_RULES.freeCancelDays}-Day cancellation:</strong> Full guest refund until {BOOKING_RULES.freeCancelDays} days before move-in date.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span><strong>{BOOKING_RULES.respondHours}h Response SLA:</strong> Hosts must accept or decline pending booking requests within {BOOKING_RULES.respondHours}h.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
