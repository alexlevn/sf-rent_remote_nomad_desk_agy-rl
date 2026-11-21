import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import type { ExchangeRates } from '@/lib/types';
import { DEFAULT_EXCHANGE_RATES } from '@/lib/pricing';
import {
  exchangeRatesSchema,
  updateExchangeRatesSchema,
} from '@/lib/validations/content';

const CURRENCY_RATES_KEY = 'currency_rates';

/**
 * Retrieves platform currency exchange rates from PostgreSQL settings table.
 * Falls back safely to DEFAULT_EXCHANGE_RATES if missing or invalid.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, CURRENCY_RATES_KEY))
      .limit(1);

    if (rows.length === 0) {
      return { ...DEFAULT_EXCHANGE_RATES };
    }

    const parsed = exchangeRatesSchema.safeParse(rows[0].value);
    if (!parsed.success) {
      return { ...DEFAULT_EXCHANGE_RATES };
    }

    return {
      EUR_USD: parsed.data.EUR_USD,
      GBP_USD: parsed.data.GBP_USD,
      USD_USD: 1.0,
    };
  } catch (err) {
    console.error('[rates] Failed to read currency_rates from DB, using defaults:', err);
    return { ...DEFAULT_EXCHANGE_RATES };
  }
}

/**
 * Updates platform currency exchange rates in PostgreSQL settings table (admin settings).
 */
export async function updateExchangeRates(
  rates: Partial<ExchangeRates>
): Promise<ExchangeRates> {
  const parsed = updateExchangeRatesSchema.parse(rates);
  const current = await getExchangeRates();

  const merged: ExchangeRates = {
    EUR_USD: parsed.EUR_USD ?? current.EUR_USD,
    GBP_USD: parsed.GBP_USD ?? current.GBP_USD,
    USD_USD: 1.0,
  };

  await db
    .insert(settings)
    .values({
      key: CURRENCY_RATES_KEY,
      value: merged,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: merged,
        updatedAt: new Date(),
      },
    });

  return merged;
}
