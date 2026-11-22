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

interface CurrencyProviderProps {
  children: React.ReactNode;
  initialRates?: ExchangeRates;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'nomaddesk_currency';

function sanitizeRates(
  base: ExchangeRates,
  incoming?: Partial<ExchangeRates> | null
): ExchangeRates {
  if (!incoming) return { ...base, USD_USD: 1.0 };
  const eurUsd =
    typeof incoming.EUR_USD === 'number' && Number.isFinite(incoming.EUR_USD) && incoming.EUR_USD > 0
      ? incoming.EUR_USD
      : base.EUR_USD;
  const gbpUsd =
    typeof incoming.GBP_USD === 'number' && Number.isFinite(incoming.GBP_USD) && incoming.GBP_USD > 0
      ? incoming.GBP_USD
      : base.GBP_USD;
  return {
    USD_USD: 1.0,
    EUR_USD: eurUsd,
    GBP_USD: gbpUsd,
  };
}

export function CurrencyProvider({ children, initialRates }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<ExchangeRates>(() =>
    sanitizeRates(DEFAULT_EXCHANGE_RATES, initialRates)
  );
  const [, startTransition] = useTransition();

  // Keep client rates synchronized when RootLayout delivers fresh DB rates
  useEffect(() => {
    if (!initialRates) return;
    startTransition(() => {
      setRates((prev) => sanitizeRates(prev, initialRates));
    });
  }, [initialRates]);

  // Synchronize selected display currency with localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (stored === 'USD' || stored === 'EUR' || stored === 'GBP') {
        startTransition(() => {
          setCurrencyState(stored);
        });
      }
    } catch {
      // Ignore localStorage read failures in private/sandboxed browsers
    }

    const handleRatesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<ExchangeRates>>;
      if (customEvent.detail) {
        startTransition(() => {
          setRates((prev) => sanitizeRates(prev, customEvent.detail));
        });
      }
    };

    window.addEventListener('nomaddesk_rates_updated', handleRatesUpdate);
    return () => {
      window.removeEventListener('nomaddesk_rates_updated', handleRatesUpdate);
    };
  }, []);

  const updateRates = (newRates: Partial<ExchangeRates>) => {
    setRates((prev) => {
      const next = sanitizeRates(prev, newRates);
      try {
        window.dispatchEvent(new CustomEvent('nomaddesk_rates_updated', { detail: next }));
      } catch {
        // Ignore custom event errors
      }
      return next;
    });
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

  const convertPrice = (amountUSDCents: number, targetCurrency?: CurrencyCode): number => {
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

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
