import type { CurrencyCode, ExchangeRates, PricingBreakdown } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  EUR_USD: 1.08, // 1 EUR = 1.08 USD
  GBP_USD: 1.26, // 1 GBP = 1.26 USD
  USD_USD: 1.0,
};

/**
 * Converts EUR cents to USD cents using current or default fixed exchange rate (D18).
 */
export function eurCentsToUSDCents(
  eurCents: number,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
  return Math.round(eurCents * rates.EUR_USD);
}

/**
 * Converts USD cents to target currency cents for display.
 */
export function convertUSDCents(
  amountUSDCents: number,
  targetCurrency: CurrencyCode,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
  switch (targetCurrency) {
    case 'EUR':
      return Math.round(amountUSDCents / rates.EUR_USD);
    case 'GBP':
      return Math.round(amountUSDCents / rates.GBP_USD);
    case 'USD':
    default:
      return amountUSDCents;
  }
}

/**
 * Pure calculation engine for booking financial totals (D18, requirements §5.4).
 * All monetary amounts are integers in USD cents.
 */
export function calculateBookingTotal(
  monthlyRentUSDCents: number,
  nights: number,
  workstationMonthlyEURCents: number = 0,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): PricingBreakdown {
  if (nights < 1) {
    throw new Error('Nights must be at least 1');
  }

  // Exact months fraction without premature month rounding
  const months = nights / 30;

  // Rent for the entire stay (USD cents)
  const rentAmountUSD = Math.round(monthlyRentUSDCents * months);

  // Workstation add-on fee converted to USD cents
  const workstationMonthlyUSD = eurCentsToUSDCents(workstationMonthlyEURCents, rates);
  const workstationFeeUSD = Math.round(workstationMonthlyUSD * months);

  // Total amount charged to the guest
  const totalAmountUSD = rentAmountUSD + workstationFeeUSD;

  // Platform commission fee (10% of rentAmount)
  const commissionRate = BOOKING_RULES.commissionRate;
  const commissionAmountUSD = Math.round(rentAmountUSD * commissionRate);

  // Host net payout (rentAmount minus commission)
  const hostPayoutUSD = rentAmountUSD - commissionAmountUSD;

  return {
    nights,
    months,
    monthlyRentUSD: monthlyRentUSDCents,
    rentAmountUSD,
    workstationMonthlyEUR: workstationMonthlyEURCents,
    workstationMonthlyUSD,
    workstationFeeUSD,
    totalAmountUSD,
    commissionRate,
    commissionAmountUSD,
    hostPayoutUSD,
  };
}

/**
 * Formats cents into localized currency string (e.g. $3,081 or €2,853).
 */
export function formatCurrency(
  amountCents: number,
  currency: CurrencyCode = 'USD',
  options: { showCents?: boolean } = {}
): string {
  const amount = amountCents / 100;
  const showDecimals = options.showCents ?? (amountCents % 100 !== 0);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}
