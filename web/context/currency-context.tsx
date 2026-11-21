'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import type { CurrencyCode, ExchangeRates } from '@/lib/types';
import { DEFAULT_EXCHANGE_RATES, convertUSDCents } from '@/lib/pricing';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

interface CurrencyContextValue {
  currency: CurrencyCode;
  symbol: string;
  rates: ExchangeRates;
  setCurrency: (code: CurrencyCode) => void;
  updateRates?: (newRates: Partial<ExchangeRates>) => void;
  formatPrice: (
    amountUSDCents: number,
    options?: { showCents?: boolean; perMonth?: boolean }
  ) => string;
  convertPrice: (amountUSDCents: number, targetCurrency?: CurrencyCode) => number;
  currencies: CurrencyConfig[];
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'nomaddesk_currency';
const RATES_STORAGE_KEY = 'nomaddesk_exchange_rates';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [, startTransition] = useTransition();

  // Synchronize with localStorage after mount to prevent SSR hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (stored && (stored === 'USD' || stored === 'EUR' || stored === 'GBP')) {
        startTransition(() => {
          setCurrencyState(stored);
        });
      }
      const storedRates = localStorage.getItem(RATES_STORAGE_KEY);
      if (storedRates) {
        const parsed = JSON.parse(storedRates);
        startTransition(() => {
          setRates((prev) => ({ ...prev, ...parsed, USD_USD: 1.0 }));
        });
      }
    } catch {
      // Ignore localStorage read failures in sandboxed environments
    }

    const handleRatesUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ExchangeRates>;
      if (customEvent.detail) {
        startTransition(() => {
          setRates((prev) => ({ ...prev, ...customEvent.detail, USD_USD: 1.0 }));
        });
      }
    };

    window.addEventListener('nomaddesk_rates_updated', handleRatesUpdate);
    return () => {
      window.removeEventListener('nomaddesk_rates_updated', handleRatesUpdate);
    };
  }, []);

  const updateRates = (newRates: Partial<ExchangeRates>) => {
    const updatedRates: ExchangeRates = {
      ...rates,
      ...newRates,
      USD_USD: 1.0,
    };
    setRates(updatedRates);
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(updatedRates));
      window.dispatchEvent(
        new CustomEvent('nomaddesk_rates_updated', { detail: updatedRates })
      );
    } catch {
      // Ignore localStorage write failures
    }
  };

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore localStorage write failures
    }
  };

  const getSymbol = (code: CurrencyCode): string => {
    switch (code) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'USD':
      default:
        return '$';
    }
  };

  const convertPrice = (
    amountUSDCents: number,
    targetCurrency?: CurrencyCode
  ): number => {
    return convertUSDCents(amountUSDCents, targetCurrency ?? currency, rates);
  };

  const formatPrice = (
    amountUSDCents: number,
    options?: { showCents?: boolean; perMonth?: boolean }
  ): string => {
    const convertedCents = convertPrice(amountUSDCents, currency);
    const symbol = getSymbol(currency);
    const amountInUnits = options?.showCents
      ? (convertedCents / 100).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : Math.round(convertedCents / 100).toLocaleString('en-US');

    const formatted = `${symbol}${amountInUnits}`;
    return options?.perMonth ? `${formatted} / month` : formatted;
  };

  const value: CurrencyContextValue = {
    currency,
    symbol: getSymbol(currency),
    rates,
    setCurrency,
    updateRates,
    formatPrice,
    convertPrice,
    currencies: SUPPORTED_CURRENCIES,
  };

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
