import { describe, it, expect } from 'vitest';
import {
  calculateBookingTotal,
  eurCentsToUSDCents,
  convertUSDCents,
  formatCurrency,
  DEFAULT_EXCHANGE_RATES,
} from './pricing';
import { BOOKING_RULES } from '@/content/booking-rules';

describe('Pricing Engine (D18 & requirements §5.4)', () => {
  it('calculates 30-night baseline stay without workstation add-ons', () => {
    // 30 nights at $3,081/month (308,100 cents)
    const result = calculateBookingTotal(308100, 30, 0);

    expect(result.nights).toBe(30);
    expect(result.months).toBe(1);
    expect(result.rentAmountUSD).toBe(308100);
    expect(result.workstationFeeUSD).toBe(0);
    expect(result.totalAmountUSD).toBe(308100);
    // 10% platform commission on rent
    expect(result.commissionAmountUSD).toBe(30810);
    // Host payout = rent - commission
    expect(result.hostPayoutUSD).toBe(277290);
    expect(result.hostPayoutUSD + result.commissionAmountUSD).toBe(result.rentAmountUSD);
  });

  it('calculates 45-night stay (1.5 months) with Pro Upgrade workstation add-on', () => {
    // Rent: $2,000/month (200,000 cents)
    // Workstation: €150/month (15,000 cents)
    // Rate: 1 EUR = 1.08 USD
    const result = calculateBookingTotal(200000, 45, 15000);

    expect(result.months).toBe(1.5);
    // Rent: 200,000 * 1.5 = 300,000 USD cents ($3,000.00)
    expect(result.rentAmountUSD).toBe(300000);

    // Workstation monthly in USD: round(15,000 * 1.08) = 16,200 cents ($162.00)
    expect(result.workstationMonthlyUSD).toBe(16200);

    // Workstation total fee: round(16,200 * 1.5) = 24,300 cents ($243.00)
    expect(result.workstationFeeUSD).toBe(24300);

    // Total: 300,000 + 24,300 = 324,300 cents ($3,243.00)
    expect(result.totalAmountUSD).toBe(324300);

    // Commission: 10% of 300,000 = 30,000 cents ($300.00)
    expect(result.commissionAmountUSD).toBe(30000);

    // Host payout: 300,000 - 30,000 = 270,000 cents ($2,700.00)
    expect(result.hostPayoutUSD).toBe(270000);
  });

  it('calculates custom stay length (37 nights) with accurate integer rounding', () => {
    const monthlyRent = 250000; // $2,500.00
    const nights = 37;
    const workstationEUR = 4000; // €40.00

    const result = calculateBookingTotal(monthlyRent, nights, workstationEUR);

    const expectedMonths = 37 / 30;
    const expectedRent = Math.round(monthlyRent * expectedMonths);
    const expectedWorkstationUSD = Math.round(workstationEUR * 1.08);
    const expectedWorkstationFee = Math.round(expectedWorkstationUSD * expectedMonths);

    expect(result.rentAmountUSD).toBe(expectedRent);
    expect(result.workstationFeeUSD).toBe(expectedWorkstationFee);
    expect(result.totalAmountUSD).toBe(expectedRent + expectedWorkstationFee);
    expect(result.commissionAmountUSD).toBe(Math.round(expectedRent * 0.1));
    expect(result.hostPayoutUSD).toBe(expectedRent - result.commissionAmountUSD);
  });

  it('rejects stays shorter than 1 night', () => {
    expect(() => calculateBookingTotal(200000, 0)).toThrow('Nights must be at least 1');
  });

  it('converts EUR cents to USD cents using rates', () => {
    expect(eurCentsToUSDCents(10000)).toBe(10800);
    expect(eurCentsToUSDCents(10000, { ...DEFAULT_EXCHANGE_RATES, EUR_USD: 1.1 })).toBe(11000);
  });

  it('converts USD cents to target currencies for display', () => {
    const usdCents = 10800; // $108.00
    expect(convertUSDCents(usdCents, 'USD')).toBe(10800);
    // At EUR_USD 1.08: 10800 / 1.08 = 10000 EUR cents
    expect(convertUSDCents(usdCents, 'EUR')).toBe(10000);
    // At GBP_USD 1.26: round(10800 / 1.26) = 8571 GBP cents
    expect(convertUSDCents(usdCents, 'GBP')).toBe(8571);
  });

  it('formats currency values correctly', () => {
    expect(formatCurrency(308100, 'USD')).toBe('$3,081');
    expect(formatCurrency(308150, 'USD')).toBe('$3,081.50');
    expect(formatCurrency(308100, 'USD', { showCents: true })).toBe('$3,081.00');
  });

  it('verifies booking business rules match specification D21', () => {
    expect(BOOKING_RULES.commissionPercent).toBe(10);
    expect(BOOKING_RULES.commissionRate).toBe(0.1);
    expect(BOOKING_RULES.respondHours).toBe(48);
    expect(BOOKING_RULES.freeCancelDays).toBe(14);
    expect(BOOKING_RULES.minimumStayNights).toBe(30);
  });
});
