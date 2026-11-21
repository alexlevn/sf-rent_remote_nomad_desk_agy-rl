export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export interface ExchangeRates {
  EUR_USD: number; // e.g. 1.08 -> 1 EUR = 1.08 USD
  GBP_USD: number; // e.g. 1.26 -> 1 GBP = 1.26 USD
  USD_USD: 1.0;
}

export interface PricingBreakdown {
  nights: number;
  months: number; // nights / 30
  monthlyRentUSD: number; // USD cents
  rentAmountUSD: number; // USD cents
  workstationMonthlyEUR: number; // EUR cents
  workstationMonthlyUSD: number; // USD cents
  workstationFeeUSD: number; // USD cents
  totalAmountUSD: number; // USD cents
  commissionRate: number; // e.g. 0.10
  commissionAmountUSD: number; // USD cents
  hostPayoutUSD: number; // USD cents
}
