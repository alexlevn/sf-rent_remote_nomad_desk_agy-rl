import type { ExchangeRates } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Retrieves platform currency exchange rates.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const store = getMockStore();
  return { ...store.rates };
}

/**
 * Updates platform currency exchange rates (admin settings).
 */
export async function updateExchangeRates(
  rates: Partial<ExchangeRates>
): Promise<ExchangeRates> {
  const store = getMockStore();
  store.rates = {
    ...store.rates,
    ...rates,
    USD_USD: 1.0,
  };
  return { ...store.rates };
}
